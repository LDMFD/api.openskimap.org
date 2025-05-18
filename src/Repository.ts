import * as arangojs from "arangojs";
import * as arangojsCollection from "arangojs/collection";
import {
  FeatureType,
  LiftFeature,
  RunFeature,
  SkiAreaFeature,
  SkiAreaSummaryFeature
} from "openskidata-format";
import * as Config from "./Config";

export class Repository {
  private database: arangojs.Database;
  private collection: arangojsCollection.DocumentCollection<any, any>;

  constructor(database: arangojs.Database) {
    this.database = database;
    this.collection = database.collection(Config.arangodb.featuresCollection);
  }

  has = async (id: string): Promise<boolean> => {
    return await this.collection.documentExists({ _key: id });
  };

  get = async (
    id: string
  ): Promise<RunFeature | LiftFeature | SkiAreaFeature> => {
    const document = await this.collection.document({ _key: id });

    return documentToFeature(document);
  };

  search = async (
    text: string,
    limit: number
  ): Promise<(RunFeature | LiftFeature | SkiAreaFeature)[]> => {
    const viewName = "textSearch";
    const viewObject = this.database.view(viewName);

    // console.log(`[API Repository] Searching for text: "${text}" with limit: ${limit}`);

    const query = arangojs.aql`
    FOR feature IN ${viewObject}
    SEARCH ANALYZER(TOKENS(${text}, "en_edge_ngram_v2") ALL IN feature.searchableText, "en_edge_ngram_v2")
    LET nameScore = LOWER(feature.properties.name) == LOWER(${text}) ? 3 : 
                    STARTS_WITH(LOWER(feature.properties.name), LOWER(${text})) ? 2 : 
                    CONTAINS(LOWER(feature.properties.name), LOWER(${text})) ? 1 : 0
    LET typeScore = feature.type == "skiArea" ? 3 :
                   feature.type == "lift" ? 2 :
                   feature.type == "run" ? 1 : 0
    SORT nameScore DESC, typeScore DESC
    LIMIT ${limit}
    RETURN feature
    `
    try {
      const cursor = await this.database.query(query);
      const results = await cursor.all();
      console.log(`[API Repository] Found ${results.length} results for text: "${text}"`);
      return results.map(documentToFeature);
    } catch (error) {
      console.error(`[API Repository] Error during search for text: "${text}":`, error);
      throw error;
    }
  };

  removeExceptImport = async (importID: string): Promise<void> => {
    await this.database.query(arangojs.aql`
    FOR feature IN ${this.collection}
    FILTER feature.importID != ${importID}
    REMOVE feature IN ${this.collection}
    OPTIONS { exclusive: true }
    `);
  };

  upsert = async (
    feature: LiftFeature | RunFeature | SkiAreaFeature,
    importID: string
  ): Promise<void> => {
    await this.upsertData(
      feature.properties.id,
      feature,
      importID
    );
  };

  private upsertData = async (
    id: string,
    feature: RunFeature | LiftFeature | SkiAreaFeature,
    importID: string
  ): Promise<void> => {
    const searchableText = getSearchableText(feature);
    await this.database.query(arangojs.aql`
      UPSERT { _key: ${id} }
      INSERT 
        {
          _key: ${id},
          type: ${feature.properties.type},
          searchableText: ${searchableText},
          geometry: ${feature.geometry},
          properties: ${feature.properties},
          importID: ${importID}
        } 
      UPDATE
        {
          _key: ${id},
          type: ${feature.properties.type},
          searchableText: ${searchableText},
          geometry: ${feature.geometry},
          properties: ${feature.properties},
          importID: ${importID}
        } 
      IN ${this.collection}
      OPTIONS { exclusive: true }
      `);
  };
}

function getSearchableText(feature: RunFeature | LiftFeature | SkiAreaFeature | SkiAreaSummaryFeature): string[] {
  let searchableText: (string | undefined | null)[] = [feature.properties.name];

  switch (feature.properties.type) {
    case FeatureType.Lift:
    case FeatureType.Run:
      feature.properties.skiAreas.forEach(skiArea => {
        searchableText.push(...getSearchableText(skiArea))  
      });
      break;
    case FeatureType.SkiArea:
      searchableText.push(feature.properties.location?.localized.en.locality);
      break;
  }
  
  return [...new Set(searchableText.filter((v): v is string => !!v))];
}

function documentToFeature(document: any): any {
  return {
    type: "Feature",
    properties: document.properties,
    geometry: document.geometry,
  };
}

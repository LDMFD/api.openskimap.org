import * as arangojs from "arangojs";
import * as Config from "./Config";
import { Repository } from "./Repository";

export default async function getRepository(): Promise<Repository> {
  const client = new arangojs.Database(Config.arangodb.url);

  try {
    const databaseName = Config.arangodb.database;
    const databases = await client.listDatabases();
    if (databases.includes(databaseName)) {
      console.log(`Database '${databaseName}' already exists.`);
    } else {
      console.log(`Database '${databaseName}' not found, attempting to create it.`);
      await client.createDatabase(databaseName);
      console.log(`Database '${databaseName}' created successfully.`);
    }
  } catch (error) {
    console.error("Error during database check or creation:", error);
  }

  const db = client.database(Config.arangodb.database);

  await db.createAnalyzer('en_edge_ngram_v2', {
    type: 'text',
    properties: {
      locale: 'en',
      accent: false,
      case: 'lower',
      stemming: false,
      edgeNgram: {
        min: 3,
        max: 20,
        preserveOriginal: true
      }
    }
  })

  const featuresCollection = db.collection(
    Config.arangodb.featuresCollection
  );
  try {
    await featuresCollection.create();
  } catch (_) {}
  await featuresCollection.ensureIndex({type: "persistent", fields: ["type"]})
  await featuresCollection.ensureIndex({type: "geo", fields: ["geometry"], geoJson: true})
  await featuresCollection.ensureIndex({
    type: 'inverted',
    name: 'textSearch',
    fields: [{name: 'searchableText[*]', analyzer: 'en_edge_ngram_v2'}, {name: 'type'}]
  })

  const view = await db.view('textSearch');
  const viewExists = await view.exists();
  if (!viewExists) {
    await db.createView(
      'textSearch',
      {type: "search-alias", indexes: [{collection: featuresCollection.name, index: 'textSearch'}]}
    );
  }

  return new Repository(db);
}

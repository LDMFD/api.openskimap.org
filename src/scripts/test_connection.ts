import * as arangojs from "arangojs";
import * as Config from "../Config";
import getRepository from "../RepositoryFactory";

(async () => {
  try {
    console.log("Connecting to ArangoDB...");
    console.log(`URL: ${Config.arangodb.url}`);
    console.log(`Database: ${Config.arangodb.database}`);
    
    // First test raw connection
    // const client = new arangojs.Database(Config.arangodb.url);
    // TEMP: For testing connection with explicit credentials
    const dbUrl = new URL(Config.arangodb.url);
    const username = dbUrl.username || "root"; // Default to root if not in URL
    const password = dbUrl.password || "offskimap"; // Default to offskimap if not in URL
    
    // Ensure the URL passed to arangojs.Database does not contain credentials
    dbUrl.username = "";
    dbUrl.password = "";

    const client = new arangojs.Database({
      url: dbUrl.toString(),
      auth: { username: username, password: password },
    });

    console.log("\nListing all databases:");
    const databases = await client.listDatabases();
    console.log(databases);

    // Now test using getRepository which should set everything up
    console.log("\nTesting getRepository()...");
    const repository = await getRepository();
    
    // Get the database from the repository
    const db = repository["database"] as arangojs.Database;
    
    // List collections
    console.log("\nListing collections:");
    const collections = await db.collections();
    console.log(collections.map(c => c.name));

    // List views
    console.log("\nListing views:");
    const views = await db.views();
    console.log(views.map(v => v.name));

    // List analyzers
    console.log("\nListing analyzers:");
    const analyzers = await db.listAnalyzers();
    console.log(analyzers);

    console.log("\nConnection test completed successfully!");
  } catch (e) {
    console.error("Failed testing connection:", e);
    process.exit(1);
  }
})(); 
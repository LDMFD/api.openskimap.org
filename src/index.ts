import express from "express";
import * as path from "path";
import * as config from "./Config";
import { async } from "./Middleware";
import getRepository from "./RepositoryFactory";

const app = express();
const port = 3000;

(async () => {
  const repository = await getRepository();

  app.get("/index.html", async (req, res) => {
    if (req.query.obj && typeof req.query.obj === "string") {
      try {
        const objectExists = await repository.has(req.query.obj);
        if (!objectExists) {
          res.status(404);
        }
      } catch (error) {
        console.log(`Failed to verify object`);
        console.log(error);
      }
    }

    const frontendPath = config.frontend.path;
    if (!frontendPath) {
      console.log("Missing frontend path, cannot handle index.html responses");
      res.sendStatus(500);
      return;
    }

    res.sendFile(path.join(frontendPath, "index.html"));
  });

  app.get("/*", function (_, res, next) {
    res.header("Access-Control-Allow-Methods", "GET");
    res.header("Access-Control-Allow-Origin", "*");
    next();
  });

  app.get(
    "/search",
    async(async (req, res) => {
      let text = req.query.query;
      if (typeof text !== "string") {
        res.status(400).json({ error: 'Invalid query' });
        return;
      }

      text = text.trim();
      if (text.length === 0) {
        res.send([]);
        return;
      }

      let limit = 10;
      
      // Use the consolidated search that prioritizes by feature type
      const results: GeoJSON.Feature[] = await repository.search(
        text,
        limit
      );

      res.send(results);
    })
  );

  app.get(
    "/features/:id.geojson",
    async(async (req, res) => {
      const feature = await repository.get(req.params.id);

      if (feature === null) {
        res.sendStatus(404);
      } else {
        res.send(feature);
      }
    })
  );

  app.listen(port, () => console.log(`Listening on ${port}`));
})();

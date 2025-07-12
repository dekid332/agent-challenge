import { Mastra } from "@mastra/core";
import { peggWatchAgent } from "./agents/pegg-watch/pegg-watch-agent";

export const agents = {
  peggWatchAgent,
};

export const mastra = new Mastra({
  agents,
});

export { peggWatchAgent };
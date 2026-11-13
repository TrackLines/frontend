import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "frontend";
export default defineRailway(() => {
  const frontend = service("frontend", {
    source: github("TrackLines/frontend"),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/",
    healthcheckTimeout: 300,
    replicas: { "europe-west4-drams3a": 1 },
    domains: ["tracklin.es"],
  });

  return project("Tracklines", {
    variables: { managed: false },
    resources: [frontend],
  });
});

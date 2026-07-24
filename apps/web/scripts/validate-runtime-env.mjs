const failures = [];

function requireValue(name, minimumLength = 1) {
  const value = process.env[name];
  if (!value || value.length < minimumLength)
    failures.push(`${name} is missing or too short`);
}

if (process.env.NODE_ENV === "production") {
  requireValue("AUTH_SECRET", 32);
  requireValue("DATABASE_URL", 12);
  requireValue("S3_ENDPOINT", 8);
  requireValue("S3_BUCKET", 3);
  requireValue("S3_ACCESS_KEY_ID", 3);
  requireValue("S3_SECRET_ACCESS_KEY", 20);

  for (const name of ["APP_URL", "NEXTAUTH_URL"]) {
    const value = process.env[name];
    try {
      if (!value || new URL(value).protocol !== "https:")
        failures.push(`${name} must use HTTPS in production`);
    } catch {
      failures.push(`${name} is not a valid URL`);
    }
  }
}

if (failures.length) {
  console.error("Nova Gym refused to start due to insecure configuration:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Nova Gym runtime security configuration: OK");

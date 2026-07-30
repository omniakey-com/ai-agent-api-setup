# Security

## Secrets

The web configurator never asks for, stores, or transmits API keys. Generated
snippets reference an environment-variable name instead of embedding a secret.
The local CLI also reads keys only from the environment.

Do not include real keys in issues, screenshots, generated files, or shell
history. Revoke any key that may have been exposed.

## Reporting

Report a vulnerability privately through GitHub Security Advisories for this
repository. Include the affected version, reproduction steps, and impact.

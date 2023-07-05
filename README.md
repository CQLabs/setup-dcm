# Setup DCM Action

`setup-dcm` installs and sets up [DCM](https://dcm.dev/) for use in GitHub Actions.

## Usage example

```yml
name: DCM

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: dart-lang/setup-dart@v1
      - uses: CQLabs/setup-dcm@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

      - run: dcm analyze --ci-key="${{ secrets.DCM_CI_KEY }}" --email="${{ secrets.DCM_EMAIL }}" lib
```

## Inputs

The action takes the following inputs:

* `github_token`: Used to get the latest DCM version from GitHub releases (required).
* `version`: Which DCM version to setup:
  * A specific DCM version (ex. `1.6.0`)
  * or `latest` (default)

## Outputs

The action produces the following output:

* `dcm-version`: The version of the DCM executable that was installed.

## License

See the [LICENSE](LICENSE) file.

## Version history

Please see our [CHANGELOG.md](CHANGELOG.md) file.

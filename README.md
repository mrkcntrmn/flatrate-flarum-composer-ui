# flatrate/flarum-composer-ui

Schema-free Flarum 1.8.19+ presentation extension for FlatRate.wiki mobile discussion and reply composers.

```text
extension id: flatrate-composer-ui
package:      flatrate/flarum-composer-ui
stable:       1.0.0
schema:       none
```

## Requirements

Composer `require` (see `composer.json`):

```text
php:         ^8.1
flarum/core: ^1.8.19
```

## Installation

Stable release **1.0.0** (annotated tag `v1.0.0` on `main`).

From your Flarum application root, register the GitHub VCS repository and install the 1.x line:

```bash
composer config repositories.flatrate-composer-ui vcs https://github.com/mrkcntrmn/flatrate-flarum-composer-ui
composer require flatrate/flarum-composer-ui:^1.0
php flarum cache:clear
```

For an exact production pin:

```bash
composer require flatrate/flarum-composer-ui:1.0.0
```

Do not install from `dev-main`, `dev-main#<sha>`, or other moving Git references in production.

## Safety

```text
PRODUCTION_MUTATION=false
DATABASE_MIGRATIONS=none
```

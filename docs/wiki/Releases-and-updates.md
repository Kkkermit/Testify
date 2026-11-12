## How a release happens

- **Work lands on `develop`.** Every change is a pull request into `develop`, tested on the way in.
- **A release is a pull request from `develop` into `main`.** Its **Release notes** section becomes the release's
  text.
- **Merging into `main` publishes it automatically.** CI reads the version from `package.json`, tags it
  `release/v<version>`, publishes a [GitHub Release](https://github.com/Kkkermit/Testify/releases) with those notes,
  and pushes the Docker image.

Watch the repository for **Releases only** on GitHub to hear about each one.

## Docker image tags

[`ghcr.io/kkkermit/testify`](https://github.com/Kkkermit/Testify/pkgs/container/testify) has three kinds of tag:

| Tag            | What it is                                  |
| -------------- | ------------------------------------------- |
| `2.4.0` and on | One release: pin it to stay on that version |
| `latest`       | The newest release                          |
| `sha-<commit>` | The image built from one commit on `main`   |

## Updating your copy

**Read the release's "Before you upgrade" section first.** It says whether anything needs setting up, such as a new
permission or a new setting.

**From the published image:**

```bash
docker compose -f docker-compose.yml -f docker-compose.image.yml pull
docker compose -f docker-compose.yml -f docker-compose.image.yml up -d
```

**From a clone:**

```bash
git pull
npm ci
npm run build
```

Then restart the bot, or run `docker compose up -d --build` if you build the image yourself. Your `.env` and your
database aren't touched. A release that needs anything changed says so under **Before you upgrade**.

## Which version is running

- The website's footer and the [status page](https://testify.lol/status) show the running version.
- The owner console's **Runtime** tab shows it too, with a link to the releases. The bot never checks for updates
  by itself.
- The source browser at [testify.lol/source-code](https://testify.lol/source-code) shows the code of the release that's
  running.

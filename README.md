# input-tester

A web page that shows you, live and exactly, what your keyboard, mouse and touchpad send and what each gesture is taken to mean, composed only from four published, reusable parts: `input-capture`, `input-binding`, `vector-scene` and `snap-grid`.\
It runs wholly in your browser and sends nothing anywhere.

---

## Open it

Open `https://input.apnex.io` in a Chromium-based browser, ChromeOS's among them; in any other the page says its coverage is not proved there.\
Press keys, click, drag, chord buttons, turn the wheel or pinch the touchpad: each key and button lights while held, each input is logged as delivered, and every rule it is matched against is listed beside the picture, the one it matched marked.

Choose the keyboard drawn with the links above the picture, or in the address, which a bookmark keeps:
```text
https://input.apnex.io/?plan=ansi
https://input.apnex.io/?plan=chromebook
```

The page claims every key, button, wheel, double click and context menu, so the browser does nothing with them, but leaves reload, fullscreen, the developer tools and view source to the browser, whatever letters your keyboard prints.\
What no page can know -- shortcuts the system keeps, a pinch told from Ctrl and the wheel, which keyboard you hold -- is listed on the page, never guessed.

To run it on your own machine, build it (below) and serve the site with the browser rule every response carries:
```bash
npm run serve
```

---

## Build and test

Prerequisites: Node.js at the version `package.json`'s `engines` names, `google-chrome` on `PATH` (or `CHROME` naming a Chrome), and a mission-kit checkout beside this repository, or `MISSION_KIT` naming one, for the style checks.

Install the four parts from the release files `package-lock.json` pins, each refused if its hash differs, and build:
```bash
npm ci
npm run build
```

The build compiles `src/` with `tsc` and lays the site out in `site/` as a release is laid out: `index.html`, and one folder named `v<version>` holding the stylesheet, the built modules in `app/`, the four parts' files in `vendor/`, and `SHA256SUMS`.\
`vendor/` holds each part's release files unchanged; after changing a pin in `package.json`, install and copy them again:
```bash
npm install
npm run vendor
```

Run the gate, which every push runs too -- the vendoring, the build, the tests in Node and in headless Chrome, and the source, vocabulary, backlog, public-text and style checks:
```bash
npm run gate
```

The gate ends by checking that `docs/ARCHITECTURE.md`, the current architecture, is what the code and the gate's results derive; after a change that alters it, derive it again and commit it:
```bash
npm run architecture
```

---

## Release

A release is made only by this repository's CI, from a tag (`.github/workflows/release.yml`): it runs the gate, builds the site with its folder named by the tag, packs it, and attaches three files to a GitHub release -- `input-tester-<tag>.tar.gz`, holding `index.html` and the folder `<tag>/`; its SHA-256, `input-tester-<tag>.tar.gz.sha256`; and the manifest of every file's SHA-256, `SHA256SUMS`.

Set `version` in `package.json` to the release's, run the gate, derive the architecture, and commit; then tag that commit `v<version>` and push the tag, writing the release's version for `<version>`:
```bash
git tag v<version>
git push origin v<version>
```

The workflow refuses a tag that is not `v` and `package.json`'s version, and never replaces a published release: a fix is a new version.

---

## Deploy

A deploy copies one release, as its GitHub release attached it, to the lab bucket, checks it there, and only then to production (`tools/deploy`, `docs/ARCHITECTURE-TARGET.md` section 9).\
It is run by an operator with their own credentials, never by CI.

Prerequisites:
- `gcloud`, authenticated with the right to write both buckets and read both backend buckets, and `gh`, authenticated;
- Node.js and `google-chrome` as for the gate;
- this repository checked out at the tag of the release being deployed -- a rollback's too, so the deploy run is that release's own -- and its packages installed with `npm ci`;
- each bucket's main page set to `index.html`, which the recorder sets on the buckets, so its host answers `/` with the entry;
- both backends serving their buckets with their edge cache off and these custom response headers, exactly as `tools/response-headers.json` holds them, on every response, a missing object's 404 among them:
```text
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```

Check out the release's tag and install, writing the release's tag for `<tag>`:
```bash
git checkout <tag>
npm ci
```

Download the release, check its archive and every file in it, and extract it:
```bash
gh release download <tag> --repo apnex/input-tester --dir release-<tag>
cd release-<tag>
sha256sum -c input-tester-<tag>.tar.gz.sha256
mkdir release
tar -xzf input-tester-<tag>.tar.gz -C release
(cd release && sha256sum -c ../SHA256SUMS)
cd ..
```

Name the buckets, the hosts and the backend buckets, writing each backend bucket's name for its placeholder:
```bash
export LAB_BUCKET=gs://input-lab-apnex-io LAB_HOST=input-lab.apnex.io LAB_BACKEND=<lab-backend-bucket>
export PROD_BUCKET=gs://input-apnex-io PROD_HOST=input.apnex.io PROD_BACKEND=<production-backend-bucket>
```

Deploy, naming the tag again, since the deploy refuses a release whose manifest is not the `SHA256SUMS` attached to that tag's GitHub release:
```bash
tools/deploy release-<tag>/release --tag <tag>
```

For each bucket, the lab first, the deploy copies every object of the release's folder where no object is, `Cache-Control: public, max-age=31536000, immutable`, skips one already there with the same bytes, and refuses one with other bytes; checks every object's bytes, headers and content type through the host, and the rule on a missing object's 404; copies `index.html` last, `Cache-Control: no-store`, replacing the entry there -- the one object a deploy replaces, under the generation it read just before -- and checks it, the backend's edge cache and the gate's smoke run there.\
A failed check stops the deploy before the entry it would have written, and before production, and nothing is ever deleted, so a tab open on an earlier release stays whole, and a rollback is the earlier release deployed again from its own tag, which finds its folder present and switches the entry back.

---

## Documents

- `VISION.md` - why input-tester exists, and what it will never be.
- `docs/ARCHITECTURE-TARGET.md` - the architecture it is built to, ratified.
- `docs/ARCHITECTURE.md` - the current architecture, derived from the code and the gate's results, never written by hand.
- `docs/GUIDE.md` - how the four parts compose, this code its worked example.
- `docs/DECISIONS.md` - the tester's own rulings, and what each build settled.
- `docs/BACKLOG.md` - what is deferred, each with its revival trigger, and every workaround ever needed.

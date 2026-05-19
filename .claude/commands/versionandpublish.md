Ask the user which version bump type they want: patch (bug fixes), minor (new features), or major (breaking changes). Then run `./version.sh <type>` using the Bash tool. The script will bump the version in manifest.json, commit, create a git tag, and push to origin — which triggers the GitHub Actions CI/CD pipeline to package and publish to the Chrome Web Store automatically.

After running, report the new version number and confirm that the CI/CD pipeline has been triggered.

# Vibe Sandbox

A comprehensive guide and sandbox to provide an inclusive guide for anyone interested at Amazon in setting up their local development environments.

## Overview

This project aims to streamline the onboarding process for anyone interested by providing clear instructions and tools for setting up a local development environment. The guide includes step-by-step instructions, verification scripts, and troubleshooting tips.

> **Note for Development:** Project progress and development notes are tracked in the local `/worklog` directory (excluded from git). Reference this directory to see where work left off and what's planned next.

## Getting Started

### Prerequisites

- macOS operating system

- Administrator access to your machine

- Member of permission groups

  - [apolloop](https://permissions.amazon.com/group.mhtml?target=12071)

  - [source-code](https://permissions.amazon.com/group.mhtml?target=10032773)

  - [software](https://permissions.amazon.com/group.mhtml?target=12057)

  - [toolbox-users](https://permissions.amazon.com/group.mhtml?target=10032773)-\*

- Git permissions

### Checking permission groups

1. Visit your permissions page: `https://permissions.amazon.com/user.mhtml?lookup_user=` **youralias**

2. Search the page for the 4 groups listed above.

3. If missing these, contact your manager and ask to be added to that group

   - _May take up to 24 hours to propagate_

### Installing required tools

1. Homebrew `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
2. Node `brew install node`

### Setting up SSH

1. `ssh  -V`
2. `ssh-keygen  -t  ecdsa` _(Hit enter to skip entering a keyphrase)_
   _If issues arise, visit [SSH setup documentation](https://docs.hub.amazon.dev/dev-setup/laptop-macos/) for more information_

### Connect to Midway

1. `mwinit -o`
2. Enter PIN & Yubikey
   _(This may require establishing a new [Security Key Registration](https://register.midway-auth.amazon.com/nextgen/user-cert/62RBQQ))_

### Download toolbox script

1. Run the following in command line (Copy & Paste the entire string)

```
touch  ~/toolbox-bootstrap.sh  &&  \
  curl  -X  POST  \
  --data  '{"os":"osx"}'  \
  -H  "Authorization: $(curl  -L  \
  --cookie  $HOME/.midway/cookie  \
  --cookie-jar  $HOME/.midway/cookie  \
  "https://midway-auth.amazon.com/SSO?client_id=https://us-east-1.prod.release-service.toolbox.builder-tools.aws.dev&response_type=id_token&nonce=$RANDOM&redirect_uri=https://us-east-1.prod.release-service.toolbox.builder-tools.aws.dev:443")"  \
  https://us-east-1.prod.release-service.toolbox.builder-tools.aws.dev/v1/bootstrap  \
  >  ~/toolbox-bootstrap.sh
```

2. **Run script**
   `bash ~/toolbox-bootstrap.sh`

3. **Remove script**
   Once the installation completes, remove the Builder Toolbox install script:
   `rm ~/toolbox-bootstrap.sh`

4. **Add `toolbox` to `PATH`:**
   `source ~/.$(basename "$SHELL")rc`

5. **Confirm that toolbox works**
   `toolbox list`

6. **Install Git**
   `brew install git`

### VS Code Setup

1. Download and install [VS Code](https://code.visualstudio.com/download)
2. Install the [Amazon Q plugin](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.amazon-q-vscode) for VS Code
3. Open the plugin
4. Login to Q

### Install the Vibe starter kit!

1. Provide Q with the following prompt

```
I have a starter git bundle to download from: [UPDATE_WITH_NEW_BUNDLE_URL]/vibe-sandbox.bundle

Please download this, and run the following:
   cd ~/Desktop
   git clone vibe-sandbox.bundle vibe-sandbox
   cd vibe-sandbox
   npm install
   npm start

I want to have this running locally!
```

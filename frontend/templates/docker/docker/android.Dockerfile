# syntax=docker/dockerfile:1
# Builds the Android app (.apk) without installing Android Studio.
#   npm run build:android -- --docker   → apk lands in ./artifacts/
FROM eclipse-temurin:21-jdk-jammy

ENV ANDROID_HOME=/opt/android-sdk
ENV PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p "$ANDROID_HOME/cmdline-tools" \
  && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/tools.zip \
  && unzip -q /tmp/tools.zip -d "$ANDROID_HOME/cmdline-tools" \
  && mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest" \
  && rm /tmp/tools.zip \
  && yes | sdkmanager --licenses >/dev/null \
  && sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' >/dev/null

WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages packages
RUN npm ci --no-audit --no-fund --workspace @app/web --workspace @app/mobile --include-workspace-root
COPY tsconfig.base.json project.config.json ./
COPY apps/web apps/web
COPY apps/mobile apps/mobile

ARG VITE_API_URL
ARG RELEASE=0
ENV VITE_API_URL=$VITE_API_URL RELEASE=$RELEASE
RUN --mount=type=cache,target=/root/.gradle --mount=type=cache,target=/root/.android \
  npm run build:android --workspace @app/mobile

CMD ["sh", "-c", "mkdir -p /artifacts && cp apps/mobile/android/app/build/outputs/apk/*/*.apk /artifacts/ && ls -la /artifacts"]

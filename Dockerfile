# syntax=docker/dockerfile:1

FROM node:24.21.0-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:25-jdk AS backend-build
WORKDIR /app/backend
COPY --chmod=0755 backend/mvnw ./
COPY backend/.mvn/ .mvn/
COPY backend/pom.xml ./
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B dependency:go-offline -Dskip.installnodenpm -Dskip.npm
COPY backend/src/ src/
COPY --from=frontend-build /app/frontend/dist/ /app/frontend/dist/
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B clean package -Dskip.installnodenpm -Dskip.npm -DskipTests
# Layered extraction, see https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html
RUN cp target/*.jar application.jar \
    && java -Djarmode=tools -jar application.jar extract --layers --destination extracted

FROM eclipse-temurin:25-jre AS runtime
RUN adduser --disabled-password --gecos "" --no-create-home --uid 10001 appuser
WORKDIR /application
COPY --from=backend-build /app/backend/extracted/dependencies/ ./
COPY --from=backend-build /app/backend/extracted/spring-boot-loader/ ./
COPY --from=backend-build /app/backend/extracted/snapshot-dependencies/ ./
COPY --from=backend-build /app/backend/extracted/application/ ./
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Cosmos.slnx ./
COPY src/Cosmos.API/Cosmos.API.csproj src/Cosmos.API/
COPY src/Cosmos.Application/Cosmos.Application.csproj src/Cosmos.Application/
COPY src/Cosmos.Contracts/Cosmos.Contracts.csproj src/Cosmos.Contracts/
COPY src/Cosmos.Domain/Cosmos.Domain.csproj src/Cosmos.Domain/
COPY src/Cosmos.Infrastructure/Cosmos.Infrastructure.csproj src/Cosmos.Infrastructure/
COPY src/Cosmos.Persistence/Cosmos.Persistence.csproj src/Cosmos.Persistence/
COPY src/Cosmos.Shared/Cosmos.Shared.csproj src/Cosmos.Shared/


RUN dotnet restore src/Cosmos.API/Cosmos.API.csproj

COPY src/ src/

RUN dotnet publish src/Cosmos.API/Cosmos.API.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Cosmos.API.dll"]

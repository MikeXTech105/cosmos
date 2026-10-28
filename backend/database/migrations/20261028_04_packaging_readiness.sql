-- Additive packaging conversion readiness projection; no masters or history are rewritten.
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_PackagingProfile_Get @Id BIGINT AS
BEGIN SET NOCOUNT ON;
 SELECT p.Id,p.ItemId,i.ItemCode,i.Name ItemName,p.ChannelId,c.Code ChannelCode,p.PackagingCode,p.PackagingName,p.UnitsPerBox,p.Length,p.Width,p.Height,p.DimensionUnit,p.GrossWeight,p.NetWeight,p.WeightUnit,p.VolumetricDivisor,p.CalculatedVolumetricWeight,p.IsDefault,p.IsActive,p.EffectiveFrom,p.EffectiveTo,p.CreatedAtUtc,p.CreatedBy,p.UpdatedAtUtc,p.UpdatedBy,CONVERT(BIT,CASE WHEN p.SourceUnitId IS NOT NULL AND p.BaseUnitIdSnapshot=i.UnitId AND p.SourceQuantityBasis>0 AND p.BaseQuantityBasis>0 AND NULLIF(LTRIM(RTRIM(p.ConversionSourceReference)),N'') IS NOT NULL THEN 1 ELSE 0 END) ConversionReady,(SELECT Name FROM dbo.Units WHERE Id=p.SourceUnitId) SourceUnitName,(SELECT Name FROM dbo.Units WHERE Id=p.BaseUnitIdSnapshot) BaseUnitName,p.SourceQuantityBasis,p.BaseQuantityBasis
 FROM dbo.ItemPackagingProfiles p JOIN dbo.Items i ON i.Id=p.ItemId LEFT JOIN dbo.SalesChannels c ON c.Id=p.ChannelId WHERE p.Id=@Id AND p.IsDeleted=0;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_SupplyChain_PackagingProfile_List
 @Search NVARCHAR(200)=NULL,@ItemId BIGINT=NULL,@ChannelId BIGINT=NULL,@IsActive BIT=NULL,@IsDefault BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(50)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN SET NOCOUNT ON;SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber);SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize));
 SELECT p.Id,p.ItemId,i.ItemCode,i.Name ItemName,p.ChannelId,c.Code ChannelCode,p.PackagingCode,p.PackagingName,p.UnitsPerBox,p.Length,p.Width,p.Height,p.DimensionUnit,p.GrossWeight,p.NetWeight,p.WeightUnit,p.VolumetricDivisor,p.CalculatedVolumetricWeight,p.IsDefault,p.IsActive,p.EffectiveFrom,p.EffectiveTo,p.CreatedAtUtc,p.CreatedBy,p.UpdatedAtUtc,p.UpdatedBy,CONVERT(BIT,CASE WHEN p.SourceUnitId IS NOT NULL AND p.BaseUnitIdSnapshot=i.UnitId AND p.SourceQuantityBasis>0 AND p.BaseQuantityBasis>0 AND NULLIF(LTRIM(RTRIM(p.ConversionSourceReference)),N'') IS NOT NULL THEN 1 ELSE 0 END) ConversionReady,(SELECT Name FROM dbo.Units WHERE Id=p.SourceUnitId) SourceUnitName,(SELECT Name FROM dbo.Units WHERE Id=p.BaseUnitIdSnapshot) BaseUnitName,p.SourceQuantityBasis,p.BaseQuantityBasis,COUNT(1) OVER() TotalCount
 FROM dbo.ItemPackagingProfiles p JOIN dbo.Items i ON i.Id=p.ItemId LEFT JOIN dbo.SalesChannels c ON c.Id=p.ChannelId WHERE p.IsDeleted=0 AND (@ItemId IS NULL OR p.ItemId=@ItemId) AND (@ChannelId IS NULL OR p.ChannelId=@ChannelId) AND (@IsActive IS NULL OR p.IsActive=@IsActive) AND (@IsDefault IS NULL OR p.IsDefault=@IsDefault) AND (@Search IS NULL OR p.PackagingCode LIKE N'%'+@Search+N'%' OR p.PackagingName LIKE N'%'+@Search+N'%' OR i.ItemCode LIKE N'%'+@Search+N'%' OR i.Name LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN UPPER(@SortDirection)=N'DESC' THEN -p.Id ELSE p.Id END OFFSET (@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO


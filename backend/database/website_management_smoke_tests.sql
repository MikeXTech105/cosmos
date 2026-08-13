/* Transactional Website Management behavioural smoke tests. Requires one active Cosmos user. */
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @UserId INT=(SELECT TOP(1) Id FROM dbo.Users WHERE IsActive=1 AND IsDeleted=0 ORDER BY Id);
 IF @UserId IS NULL THROW 52680,N'Website Management smoke tests require an active Cosmos user.',1;
 DECLARE @Token NVARCHAR(36)=CONVERT(NVARCHAR(36),NEWID()),@ProductId BIGINT,@CategoryId BIGINT,@PostId BIGINT,@ClaimId BIGINT,@RowVersion VARBINARY(8),@ReferenceId NVARCHAR(30);
 EXEC dbo.usp_WebsiteProduct_Save @Code=N'smoke-'+@Token,@Name=N'Smoke Website Product',@Description=N'Smoke',@DisplayPrice=299,@CurrencyCode=N'INR',@Rating=4.5,@ReviewCount=1,@SortOrder=1,@PublishStatus=N'Published',@IsActive=1,@BenefitsJson=N'[{"BenefitText":"Durable","SortOrder":1}]',@MediaJson=N'[{"PublicUrl":"/uploads/website/smoke.jpg","AltText":"Smoke","SortOrder":1,"IsPrimary":true}]',@CurrentUserId=@UserId;
 SELECT @ProductId=Id FROM dbo.WebsiteProducts WHERE Code=N'smoke-'+@Token;
 IF @ProductId IS NULL OR NOT EXISTS(SELECT 1 FROM dbo.WebsiteProducts WHERE Id=@ProductId AND IsDeleted=0 AND PublishStatus=N'Published') THROW 52681,N'Website product smoke test failed.',1;
 EXEC dbo.usp_WebsiteBlogCategory_Save @Name=N'Smoke '+@Token,@Slug=N'smoke-'+@Token,@Description=N'Smoke',@SortOrder=1,@IsActive=1,@CurrentUserId=@UserId;
 SELECT @CategoryId=Id FROM dbo.WebsiteBlogCategories WHERE Slug=N'smoke-'+@Token;
 EXEC dbo.usp_WebsiteBlogPost_Save @Title=N'Smoke blog',@Slug=N'smoke-blog-'+@Token,@Excerpt=N'Smoke excerpt',@Content=N'## Smoke content',@ReadTime=N'1 min read',@CategoryId=@CategoryId,@PublishStatus=N'Published',@PublishedAtUtc=SYSUTCDATETIME(),@IsFeatured=0,@SortOrder=1,@CurrentUserId=@UserId;
 SELECT @PostId=Id FROM dbo.WebsiteBlogPosts WHERE Slug=N'smoke-blog-'+@Token;
 IF NOT EXISTS(SELECT 1 FROM dbo.WebsiteBlogPosts WHERE Id=@PostId AND PublishStatus=N'Published') THROW 52682,N'Published blog smoke test failed.',1;
 EXEC dbo.usp_WebsiteAnnouncement_Save @Title=N'Smoke',@Message=N'Smoke announcement',@Placement=N'TopBar',@Priority=10,@StartsAtUtc=DATEADD(MINUTE,-1,SYSUTCDATETIME()),@EndsAtUtc=DATEADD(MINUTE,1,SYSUTCDATETIME()),@IsActive=1,@DismissalVersion=N'1',@SortOrder=1,@CurrentUserId=@UserId;
 IF NOT EXISTS(SELECT 1 FROM dbo.WebsiteAnnouncements WHERE Title=N'Smoke' AND IsDeleted=0) THROW 52683,N'Announcement scheduling smoke test failed.',1;
 EXEC dbo.usp_WebsiteWarrantyClaim_CreatePublic @FullName=N'Smoke Customer',@Email=N'smoke@example.test',@OrderNumber=N'ORDER-'+@Token,@PurchaseDate='2026-08-01',@Description=N'This is a warranty smoke-test description.',@Source=N'Smoke',@Consent=1,@AttachmentsJson=N'[{"StorageKey":"smoke/invoice.pdf","OriginalFileName":"invoice.pdf","DetectedMimeType":"application/pdf","SizeBytes":100,"AttachmentType":0},{"StorageKey":"smoke/damage.jpg","OriginalFileName":"damage.jpg","DetectedMimeType":"image/jpeg","SizeBytes":100,"AttachmentType":1}]';
 SELECT @ClaimId=Id,@ReferenceId=ReferenceId FROM dbo.WebsiteWarrantyClaims WHERE OrderNumber=N'ORDER-'+@Token;
 IF @ClaimId IS NULL OR @ReferenceId NOT LIKE N'WC-%' OR (SELECT COUNT(*) FROM dbo.WebsiteWarrantyClaimAttachments WHERE WarrantyClaimId=@ClaimId)<>2 THROW 52684,N'Warranty public create smoke test failed.',1;
 EXEC dbo.usp_WebsiteWarrantyClaim_Transition @ClaimId=@ClaimId,@TargetStatus=N'UnderReview',@CurrentUserId=@UserId;
 EXEC dbo.usp_WebsiteWarrantyClaim_Transition @ClaimId=@ClaimId,@TargetStatus=N'Approved',@CurrentUserId=@UserId;
 EXEC dbo.usp_WebsiteWarrantyClaim_Resolve @ClaimId=@ClaimId,@ResolutionType=N'Replacement',@ReplacementReference=N'REPL-'+@Token,@CurrentUserId=@UserId;
 EXEC dbo.usp_WebsiteWarrantyClaim_Transition @ClaimId=@ClaimId,@TargetStatus=N'Completed',@CurrentUserId=@UserId;
 IF NOT EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaims WHERE Id=@ClaimId AND Status=N'Completed' AND ResolutionType=N'Replacement') OR (SELECT COUNT(*) FROM dbo.WebsiteWarrantyClaimHistory WHERE WarrantyClaimId=@ClaimId)<5 THROW 52685,N'Warranty workflow/history smoke test failed.',1;
 DECLARE @Invalid TABLE(StatusCode INT,Message NVARCHAR(500)); INSERT @Invalid EXEC dbo.usp_WebsiteWarrantyClaim_Transition @ClaimId=@ClaimId,@TargetStatus=N'UnderReview',@CurrentUserId=@UserId;
 IF NOT EXISTS(SELECT 1 FROM @Invalid WHERE StatusCode=400) THROW 52686,N'Invalid warranty transition was not rejected.',1;
 EXEC dbo.usp_WebsiteWarrantyClaim_GetReport;
 ROLLBACK TRANSACTION;
 PRINT N'Website Management smoke tests passed; all test data was rolled back.';
END TRY
BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH;

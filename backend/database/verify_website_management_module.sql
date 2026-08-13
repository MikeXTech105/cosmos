/* Read-only structural and integrity verification for Website Management. */
SET NOCOUNT ON;

DECLARE @Tables TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @Tables(Name) VALUES
 (N'WebsiteProducts'),(N'WebsiteProductBenefits'),(N'WebsiteProductMedia'),(N'WebsiteBlogCategories'),(N'WebsiteBlogPosts'),(N'WebsiteAnnouncements'),
 (N'WebsiteWarrantyClaimSequences'),(N'WebsiteWarrantyClaims'),(N'WebsiteWarrantyClaimAttachments'),(N'WebsiteWarrantyClaimHistory'),(N'WebsiteWarrantyClaimNotes'),(N'WebsiteWarrantyClaimCustomerMessages'),(N'WebsiteSettings'),(N'WebsiteContactEnquiries');
IF EXISTS(SELECT 1 FROM @Tables t WHERE OBJECT_ID(N'dbo.'+t.Name,N'U') IS NULL) THROW 52650,N'Website Management table verification failed.',1;

DECLARE @Columns TABLE(TableName SYSNAME NOT NULL,ColumnName SYSNAME NOT NULL,PRIMARY KEY(TableName,ColumnName));
INSERT @Columns(TableName,ColumnName) VALUES
 (N'WebsiteProducts',N'Code'),(N'WebsiteProducts',N'PublishStatus'),(N'WebsiteProducts',N'IsDeleted'),(N'WebsiteProducts',N'RowVersion'),
 (N'WebsiteBlogPosts',N'Slug'),(N'WebsiteBlogPosts',N'CategoryId'),(N'WebsiteBlogPosts',N'PublishedAtUtc'),(N'WebsiteBlogPosts',N'RowVersion'),
 (N'WebsiteAnnouncements',N'Placement'),(N'WebsiteAnnouncements',N'StartsAtUtc'),(N'WebsiteAnnouncements',N'EndsAtUtc'),
 (N'WebsiteWarrantyClaims',N'ReferenceId'),(N'WebsiteWarrantyClaims',N'Status'),(N'WebsiteWarrantyClaims',N'ResolutionType'),(N'WebsiteWarrantyClaims',N'ConsentAcceptedAtUtc'),
 (N'WebsiteWarrantyClaimAttachments',N'StorageKey'),(N'WebsiteWarrantyClaimAttachments',N'DetectedMimeType'),(N'WebsiteWarrantyClaimAttachments',N'ScanStatus'),
 (N'WebsiteWarrantyClaimHistory',N'EventType'),(N'WebsiteWarrantyClaimNotes',N'Note'),(N'WebsiteWarrantyClaimCustomerMessages',N'Message'),(N'WebsiteSettings',N'IsPublic');
IF EXISTS(SELECT 1 FROM @Columns c WHERE COL_LENGTH(N'dbo.'+c.TableName,c.ColumnName) IS NULL) THROW 52651,N'Website Management column verification failed.',1;

DECLARE @Indexes TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @Indexes(Name) VALUES(N'UX_WebsiteProducts_Code_Active'),(N'IX_WebsiteProducts_Public'),(N'UX_WebsiteBlogCategories_Slug_Active'),(N'UX_WebsiteBlogPosts_Slug_Active'),(N'IX_WebsiteBlogPosts_Public'),(N'IX_WebsiteAnnouncements_Public'),(N'IX_WebsiteWarrantyClaims_List'),(N'IX_WebsiteWarrantyClaimAttachments_Claim'),(N'IX_WebsiteWarrantyClaimHistory_Claim');
IF EXISTS(SELECT 1 FROM @Indexes i WHERE NOT EXISTS(SELECT 1 FROM sys.indexes x WHERE x.name=i.Name)) THROW 52652,N'Website Management index verification failed.',1;

DECLARE @Procedures TABLE(Name SYSNAME NOT NULL PRIMARY KEY);
INSERT @Procedures(Name) VALUES
 (N'usp_WebsiteProduct_GetById'),(N'usp_WebsiteProduct_GetList'),(N'usp_WebsiteProduct_GetPublic'),(N'usp_WebsiteProduct_Save'),(N'usp_WebsiteProduct_Delete'),
 (N'usp_WebsiteBlogCategory_GetList'),(N'usp_WebsiteBlogCategory_GetPublic'),(N'usp_WebsiteBlogCategory_Save'),(N'usp_WebsiteBlogCategory_Delete'),
 (N'usp_WebsiteBlogPost_GetById'),(N'usp_WebsiteBlogPost_GetList'),(N'usp_WebsiteBlogPost_GetPublicList'),(N'usp_WebsiteBlogPost_GetPublicBySlug'),(N'usp_WebsiteBlogPost_Save'),(N'usp_WebsiteBlogPost_Delete'),
 (N'usp_WebsiteAnnouncement_GetList'),(N'usp_WebsiteAnnouncement_GetById'),(N'usp_WebsiteAnnouncement_GetPublic'),(N'usp_WebsiteAnnouncement_Save'),(N'usp_WebsiteAnnouncement_Delete'),
 (N'usp_WebsiteWarrantyClaim_CreatePublic'),(N'usp_WebsiteWarrantyClaim_GetList'),(N'usp_WebsiteWarrantyClaim_GetById'),(N'usp_WebsiteWarrantyClaim_GetAttachments'),(N'usp_WebsiteWarrantyClaim_GetAttachmentDownload'),(N'usp_WebsiteWarrantyClaim_GetHistory'),(N'usp_WebsiteWarrantyClaim_GetNotes'),(N'usp_WebsiteWarrantyClaim_GetCustomerMessages'),(N'usp_WebsiteWarrantyClaim_Assign'),(N'usp_WebsiteWarrantyClaim_Transition'),(N'usp_WebsiteWarrantyClaim_Resolve'),(N'usp_WebsiteWarrantyClaim_AddNote'),(N'usp_WebsiteWarrantyClaim_AddCustomerMessage'),(N'usp_WebsiteWarrantyClaim_GetReport'),(N'usp_WebsiteManagementDashboard_GetOverview'),(N'usp_WebsiteSettings_GetAll'),(N'usp_WebsiteSettings_GetPublic'),(N'usp_WebsiteSettings_Update'),(N'usp_WebsiteContactEnquiry_Create');
IF EXISTS(SELECT 1 FROM @Procedures p WHERE OBJECT_ID(N'dbo.'+p.Name,N'P') IS NULL) THROW 52653,N'Website Management stored-procedure verification failed.',1;

IF OBJECT_ID(N'dbo.TR_WebsiteWarrantyClaimHistory_AppendOnly',N'TR') IS NULL THROW 52654,N'Warranty history append-only trigger is missing.',1;
IF EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.WebsiteProducts') AND referenced_object_id=OBJECT_ID(N'dbo.Items')) THROW 52655,N'Website Products must not have an ERP Item foreign key.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteProducts WHERE IsDeleted=1 AND (DeletedBy IS NULL OR DeletedAtUtc IS NULL)) THROW 52656,N'Website product delete audit verification failed.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteBlogPosts WHERE IsDeleted=1 AND (DeletedBy IS NULL OR DeletedAtUtc IS NULL)) THROW 52657,N'Blog post delete audit verification failed.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteProducts WHERE IsDeleted=0 GROUP BY Code HAVING COUNT(*)>1) THROW 52658,N'Duplicate active Website Product codes were found.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteBlogPosts WHERE IsDeleted=0 GROUP BY Slug HAVING COUNT(*)>1) THROW 52659,N'Duplicate active Blog slugs were found.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaims GROUP BY ReferenceId HAVING COUNT(*)>1) THROW 52660,N'Duplicate warranty claim references were found.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaimAttachments a LEFT JOIN dbo.WebsiteWarrantyClaims c ON c.Id=a.WarrantyClaimId WHERE c.Id IS NULL) THROW 52661,N'Orphan warranty attachments were found.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaimHistory h LEFT JOIN dbo.WebsiteWarrantyClaims c ON c.Id=h.WarrantyClaimId WHERE c.Id IS NULL) THROW 52662,N'Orphan warranty history was found.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaimNotes n LEFT JOIN dbo.WebsiteWarrantyClaims c ON c.Id=n.WarrantyClaimId WHERE c.Id IS NULL) THROW 52663,N'Orphan warranty notes were found.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaimCustomerMessages m LEFT JOIN dbo.WebsiteWarrantyClaims c ON c.Id=m.WarrantyClaimId WHERE c.Id IS NULL) THROW 52664,N'Orphan warranty customer messages were found.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaims WHERE Status=N'Completed' AND ResolutionType IS NULL) THROW 52665,N'Completed warranty claims require a resolution.',1;
IF EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaims WHERE ResolutionType=N'Refund' AND (RefundAmount IS NULL OR RefundAmount<=0 OR RefundReference IS NULL)) THROW 52666,N'Refund resolution data is invalid.',1;
IF (SELECT COUNT(*) FROM dbo.Pages WHERE Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard',N'WebsiteManagement.Products',N'WebsiteManagement.Blogs',N'WebsiteManagement.Announcements',N'WebsiteManagement.WarrantyClaims',N'WebsiteManagement.Settings',N'WebsiteManagement.Media'))<>8 THROW 52667,N'Website Management page seed verification failed.',1;
IF EXISTS(SELECT 1 FROM dbo.RolePermissions rp JOIN dbo.Pages p ON p.Id=rp.PageId WHERE p.Name LIKE N'WebsiteManagement%' GROUP BY rp.RoleId,rp.PageId HAVING COUNT(*)>1) THROW 52668,N'Website Management permission seed duplicates were found.',1;
IF EXISTS(SELECT 1 FROM dbo.Roles WHERE Name=N'SuperAdmin') AND NOT EXISTS(SELECT 1 FROM dbo.RolePermissions rp JOIN dbo.Roles r ON r.Id=rp.RoleId JOIN dbo.Pages p ON p.Id=rp.PageId WHERE r.Name=N'SuperAdmin' AND p.Name=N'WebsiteManagement.WarrantyClaims' AND rp.CanView=1 AND rp.CanApprove=1) THROW 52669,N'SuperAdmin warranty permission seed verification failed.',1;

SELECT DB_NAME() CurrentDatabaseName,(SELECT COUNT_BIG(*) FROM dbo.WebsiteProducts WHERE IsDeleted=0) ActiveProductCount,(SELECT COUNT_BIG(*) FROM dbo.WebsiteBlogPosts WHERE IsDeleted=0) ActiveBlogPostCount,(SELECT COUNT_BIG(*) FROM dbo.WebsiteWarrantyClaims) WarrantyClaimCount,(SELECT COUNT_BIG(*) FROM dbo.WebsiteWarrantyClaimAttachments) WarrantyAttachmentCount,SYSUTCDATETIME() VerifiedAtUtc;

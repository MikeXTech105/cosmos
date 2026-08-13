/*
    COSMOS ERP - Website Management / WEWEL public website module.
    Additive and rerunnable. WebsiteProducts are intentionally standalone and have no ERP Item foreign key.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.WebsiteProducts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebsiteProducts
    (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteProducts PRIMARY KEY,
        Code NVARCHAR(100) NOT NULL, Name NVARCHAR(200) NOT NULL, Description NVARCHAR(4000) NULL,
        DisplayPrice DECIMAL(18,2) NULL, CurrencyCode CHAR(3) NOT NULL CONSTRAINT DF_WebsiteProducts_CurrencyCode DEFAULT(N'INR'),
        Rating DECIMAL(3,2) NULL, ReviewCount INT NULL, Badge NVARCHAR(100) NULL, UrgencyText NVARCHAR(300) NULL,
        Material NVARCHAR(200) NULL, QuantityDisplay NVARCHAR(100) NULL, IsUvResistant BIT NULL, IsRustProof BIT NULL, IsWindTested BIT NULL,
        WarrantyDisplay NVARCHAR(100) NULL, AmazonUrl NVARCHAR(1000) NULL, BrandName NVARCHAR(200) NULL, AvailabilityText NVARCHAR(100) NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_WebsiteProducts_SortOrder DEFAULT(0), PublishStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_WebsiteProducts_PublishStatus DEFAULT(N'Draft'),
        IsActive BIT NOT NULL CONSTRAINT DF_WebsiteProducts_IsActive DEFAULT(1), PublishedAtUtc DATETIME2(3) NULL,
        CreatedBy INT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteProducts_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        UpdatedBy INT NULL, UpdatedAtUtc DATETIME2(3) NULL, DeletedBy INT NULL, DeletedAtUtc DATETIME2(3) NULL, IsDeleted BIT NOT NULL CONSTRAINT DF_WebsiteProducts_IsDeleted DEFAULT(0), RowVersion ROWVERSION NOT NULL,
        CONSTRAINT CK_WebsiteProducts_Code CHECK(LEN(LTRIM(RTRIM(Code)))>0), CONSTRAINT CK_WebsiteProducts_Name CHECK(LEN(LTRIM(RTRIM(Name)))>0),
        CONSTRAINT CK_WebsiteProducts_Price CHECK(DisplayPrice IS NULL OR DisplayPrice>=0), CONSTRAINT CK_WebsiteProducts_Rating CHECK(Rating IS NULL OR Rating BETWEEN 0 AND 5),
        CONSTRAINT CK_WebsiteProducts_Reviews CHECK(ReviewCount IS NULL OR ReviewCount>=0), CONSTRAINT CK_WebsiteProducts_Status CHECK(PublishStatus IN(N'Draft',N'Published',N'Archived')),
        CONSTRAINT CK_WebsiteProducts_DeleteAudit CHECK((IsDeleted=0 AND DeletedBy IS NULL AND DeletedAtUtc IS NULL) OR (IsDeleted=1 AND DeletedBy IS NOT NULL AND DeletedAtUtc IS NOT NULL)),
        CONSTRAINT FK_WebsiteProducts_CreatedBy FOREIGN KEY(CreatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteProducts_UpdatedBy FOREIGN KEY(UpdatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteProducts_DeletedBy FOREIGN KEY(DeletedBy) REFERENCES dbo.Users(Id)
    );
END;
GO
IF OBJECT_ID(N'dbo.WebsiteProductBenefits', N'U') IS NULL
CREATE TABLE dbo.WebsiteProductBenefits
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteProductBenefits PRIMARY KEY, WebsiteProductId BIGINT NOT NULL, BenefitText NVARCHAR(500) NOT NULL, SortOrder INT NOT NULL CONSTRAINT DF_WebsiteProductBenefits_SortOrder DEFAULT(0),
    CONSTRAINT CK_WebsiteProductBenefits_Text CHECK(LEN(LTRIM(RTRIM(BenefitText)))>0), CONSTRAINT FK_WebsiteProductBenefits_Product FOREIGN KEY(WebsiteProductId) REFERENCES dbo.WebsiteProducts(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteProductMedia', N'U') IS NULL
CREATE TABLE dbo.WebsiteProductMedia
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteProductMedia PRIMARY KEY, WebsiteProductId BIGINT NOT NULL, PublicUrl NVARCHAR(1000) NOT NULL, AltText NVARCHAR(500) NULL, SortOrder INT NOT NULL CONSTRAINT DF_WebsiteProductMedia_SortOrder DEFAULT(0), IsPrimary BIT NOT NULL CONSTRAINT DF_WebsiteProductMedia_IsPrimary DEFAULT(0), CreatedBy INT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteProductMedia_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT FK_WebsiteProductMedia_Product FOREIGN KEY(WebsiteProductId) REFERENCES dbo.WebsiteProducts(Id), CONSTRAINT FK_WebsiteProductMedia_CreatedBy FOREIGN KEY(CreatedBy) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteBlogCategories', N'U') IS NULL
CREATE TABLE dbo.WebsiteBlogCategories
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteBlogCategories PRIMARY KEY, Name NVARCHAR(150) NOT NULL, Slug NVARCHAR(180) NOT NULL, Description NVARCHAR(1000) NULL, SortOrder INT NOT NULL CONSTRAINT DF_WebsiteBlogCategories_SortOrder DEFAULT(0), IsActive BIT NOT NULL CONSTRAINT DF_WebsiteBlogCategories_IsActive DEFAULT(1),
    CreatedBy INT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteBlogCategories_CreatedAtUtc DEFAULT(SYSUTCDATETIME()), UpdatedBy INT NULL, UpdatedAtUtc DATETIME2(3) NULL, DeletedBy INT NULL, DeletedAtUtc DATETIME2(3) NULL, IsDeleted BIT NOT NULL CONSTRAINT DF_WebsiteBlogCategories_IsDeleted DEFAULT(0), RowVersion ROWVERSION NOT NULL,
    CONSTRAINT CK_WebsiteBlogCategories_Name CHECK(LEN(LTRIM(RTRIM(Name)))>0), CONSTRAINT CK_WebsiteBlogCategories_Slug CHECK(Slug NOT LIKE N'%[^a-z0-9-]%'), CONSTRAINT CK_WebsiteBlogCategories_DeleteAudit CHECK((IsDeleted=0 AND DeletedBy IS NULL AND DeletedAtUtc IS NULL) OR (IsDeleted=1 AND DeletedBy IS NOT NULL AND DeletedAtUtc IS NOT NULL)),
    CONSTRAINT FK_WebsiteBlogCategories_CreatedBy FOREIGN KEY(CreatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteBlogCategories_UpdatedBy FOREIGN KEY(UpdatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteBlogCategories_DeletedBy FOREIGN KEY(DeletedBy) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteBlogPosts', N'U') IS NULL
CREATE TABLE dbo.WebsiteBlogPosts
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteBlogPosts PRIMARY KEY, Title NVARCHAR(250) NOT NULL, Slug NVARCHAR(220) NOT NULL, Excerpt NVARCHAR(1000) NOT NULL, Content NVARCHAR(MAX) NOT NULL, CoverImageUrl NVARCHAR(1000) NULL, ReadTime NVARCHAR(50) NOT NULL,
    CategoryId BIGINT NOT NULL, PublishStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_WebsiteBlogPosts_PublishStatus DEFAULT(N'Draft'), PublishedAtUtc DATETIME2(3) NULL, SeoTitle NVARCHAR(250) NULL, SeoDescription NVARCHAR(500) NULL, OpenGraphImageUrl NVARCHAR(1000) NULL, IsFeatured BIT NOT NULL CONSTRAINT DF_WebsiteBlogPosts_IsFeatured DEFAULT(0), SortOrder INT NOT NULL CONSTRAINT DF_WebsiteBlogPosts_SortOrder DEFAULT(0),
    CreatedBy INT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteBlogPosts_CreatedAtUtc DEFAULT(SYSUTCDATETIME()), UpdatedBy INT NULL, UpdatedAtUtc DATETIME2(3) NULL, DeletedBy INT NULL, DeletedAtUtc DATETIME2(3) NULL, IsDeleted BIT NOT NULL CONSTRAINT DF_WebsiteBlogPosts_IsDeleted DEFAULT(0), RowVersion ROWVERSION NOT NULL,
    CONSTRAINT CK_WebsiteBlogPosts_Title CHECK(LEN(LTRIM(RTRIM(Title)))>0), CONSTRAINT CK_WebsiteBlogPosts_Slug CHECK(Slug NOT LIKE N'%[^a-z0-9-]%'), CONSTRAINT CK_WebsiteBlogPosts_Status CHECK(PublishStatus IN(N'Draft',N'Published',N'Archived')), CONSTRAINT CK_WebsiteBlogPosts_Published CHECK(PublishStatus<>N'Published' OR PublishedAtUtc IS NOT NULL), CONSTRAINT CK_WebsiteBlogPosts_DeleteAudit CHECK((IsDeleted=0 AND DeletedBy IS NULL AND DeletedAtUtc IS NULL) OR (IsDeleted=1 AND DeletedBy IS NOT NULL AND DeletedAtUtc IS NOT NULL)),
    CONSTRAINT FK_WebsiteBlogPosts_Category FOREIGN KEY(CategoryId) REFERENCES dbo.WebsiteBlogCategories(Id), CONSTRAINT FK_WebsiteBlogPosts_CreatedBy FOREIGN KEY(CreatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteBlogPosts_UpdatedBy FOREIGN KEY(UpdatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteBlogPosts_DeletedBy FOREIGN KEY(DeletedBy) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteAnnouncements', N'U') IS NULL
CREATE TABLE dbo.WebsiteAnnouncements
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteAnnouncements PRIMARY KEY, Title NVARCHAR(200) NULL, Message NVARCHAR(1000) NOT NULL, Placement NVARCHAR(30) NOT NULL CONSTRAINT DF_WebsiteAnnouncements_Placement DEFAULT(N'TopBar'), CtaLabel NVARCHAR(100) NULL, CtaUrl NVARCHAR(1000) NULL, Priority INT NOT NULL CONSTRAINT DF_WebsiteAnnouncements_Priority DEFAULT(0), StartsAtUtc DATETIME2(3) NULL, EndsAtUtc DATETIME2(3) NULL, IsActive BIT NOT NULL CONSTRAINT DF_WebsiteAnnouncements_IsActive DEFAULT(1), DismissalVersion NVARCHAR(50) NOT NULL CONSTRAINT DF_WebsiteAnnouncements_DismissalVersion DEFAULT(N'1'), SortOrder INT NOT NULL CONSTRAINT DF_WebsiteAnnouncements_SortOrder DEFAULT(0),
    CreatedBy INT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteAnnouncements_CreatedAtUtc DEFAULT(SYSUTCDATETIME()), UpdatedBy INT NULL, UpdatedAtUtc DATETIME2(3) NULL, DeletedBy INT NULL, DeletedAtUtc DATETIME2(3) NULL, IsDeleted BIT NOT NULL CONSTRAINT DF_WebsiteAnnouncements_IsDeleted DEFAULT(0), RowVersion ROWVERSION NOT NULL,
    CONSTRAINT CK_WebsiteAnnouncements_Message CHECK(LEN(LTRIM(RTRIM(Message)))>0), CONSTRAINT CK_WebsiteAnnouncements_Placement CHECK(Placement IN(N'TopBar')), CONSTRAINT CK_WebsiteAnnouncements_Window CHECK(StartsAtUtc IS NULL OR EndsAtUtc IS NULL OR StartsAtUtc<EndsAtUtc), CONSTRAINT CK_WebsiteAnnouncements_DeleteAudit CHECK((IsDeleted=0 AND DeletedBy IS NULL AND DeletedAtUtc IS NULL) OR (IsDeleted=1 AND DeletedBy IS NOT NULL AND DeletedAtUtc IS NOT NULL)),
    CONSTRAINT FK_WebsiteAnnouncements_CreatedBy FOREIGN KEY(CreatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteAnnouncements_UpdatedBy FOREIGN KEY(UpdatedBy) REFERENCES dbo.Users(Id), CONSTRAINT FK_WebsiteAnnouncements_DeletedBy FOREIGN KEY(DeletedBy) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteWarrantyClaimSequences', N'U') IS NULL
CREATE TABLE dbo.WebsiteWarrantyClaimSequences(ClaimYear INT NOT NULL CONSTRAINT PK_WebsiteWarrantyClaimSequences PRIMARY KEY, NextNumber INT NOT NULL CONSTRAINT DF_WebsiteWarrantyClaimSequences_NextNumber DEFAULT(1), CONSTRAINT CK_WebsiteWarrantyClaimSequences_NextNumber CHECK(NextNumber>0));
GO
IF OBJECT_ID(N'dbo.WebsiteWarrantyClaims', N'U') IS NULL
CREATE TABLE dbo.WebsiteWarrantyClaims
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteWarrantyClaims PRIMARY KEY, ReferenceId NVARCHAR(30) NOT NULL, FullName NVARCHAR(100) NOT NULL, Email NVARCHAR(254) NOT NULL, OrderNumber NVARCHAR(100) NOT NULL, PurchaseDate DATE NOT NULL, Description NVARCHAR(2000) NOT NULL, Source NVARCHAR(100) NOT NULL, ConsentAccepted BIT NOT NULL, ConsentAcceptedAtUtc DATETIME2(3) NOT NULL, WebsiteProductId BIGINT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaims_Status DEFAULT(N'Submitted'), ResolutionType NVARCHAR(20) NULL, AssignedToUserId INT NULL, RefundAmount DECIMAL(18,2) NULL, RefundReference NVARCHAR(200) NULL, ReplacementReference NVARCHAR(200) NULL, ReplacementTrackingNumber NVARCHAR(200) NULL, RepairReference NVARCHAR(200) NULL, ResolutionRemarks NVARCHAR(2000) NULL,
    SubmittedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaims_SubmittedAtUtc DEFAULT(SYSUTCDATETIME()), ReviewedAtUtc DATETIME2(3) NULL, ResolvedAtUtc DATETIME2(3) NULL, CompletedAtUtc DATETIME2(3) NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaims_CreatedAtUtc DEFAULT(SYSUTCDATETIME()), UpdatedAtUtc DATETIME2(3) NULL,
    CONSTRAINT UQ_WebsiteWarrantyClaims_ReferenceId UNIQUE(ReferenceId), CONSTRAINT CK_WebsiteWarrantyClaims_Status CHECK(Status IN(N'Submitted',N'UnderReview',N'NeedMoreInformation',N'Approved',N'Rejected',N'Completed',N'Cancelled')), CONSTRAINT CK_WebsiteWarrantyClaims_Resolution CHECK(ResolutionType IS NULL OR ResolutionType IN(N'Replacement',N'Refund',N'Repair',N'Other')), CONSTRAINT CK_WebsiteWarrantyClaims_Refund CHECK(ResolutionType<>N'Refund' OR (RefundAmount>0 AND RefundReference IS NOT NULL)),
    CONSTRAINT FK_WebsiteWarrantyClaims_Product FOREIGN KEY(WebsiteProductId) REFERENCES dbo.WebsiteProducts(Id), CONSTRAINT FK_WebsiteWarrantyClaims_AssignedUser FOREIGN KEY(AssignedToUserId) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteWarrantyClaimAttachments', N'U') IS NULL
CREATE TABLE dbo.WebsiteWarrantyClaimAttachments
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteWarrantyClaimAttachments PRIMARY KEY, WarrantyClaimId BIGINT NOT NULL, AttachmentType NVARCHAR(30) NOT NULL, OriginalFileName NVARCHAR(260) NOT NULL, StorageKey NVARCHAR(500) NOT NULL, DetectedMimeType NVARCHAR(100) NOT NULL, SizeBytes BIGINT NOT NULL, ScanStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaimAttachments_ScanStatus DEFAULT(N'Pending'), CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaimAttachments_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT CK_WebsiteWarrantyClaimAttachments_Type CHECK(AttachmentType IN(N'Invoice',N'ProductDamageImage')), CONSTRAINT CK_WebsiteWarrantyClaimAttachments_Size CHECK(SizeBytes>0), CONSTRAINT CK_WebsiteWarrantyClaimAttachments_Scan CHECK(ScanStatus IN(N'Pending',N'Clean',N'Rejected')), CONSTRAINT FK_WebsiteWarrantyClaimAttachments_Claim FOREIGN KEY(WarrantyClaimId) REFERENCES dbo.WebsiteWarrantyClaims(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteWarrantyClaimHistory', N'U') IS NULL
CREATE TABLE dbo.WebsiteWarrantyClaimHistory
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteWarrantyClaimHistory PRIMARY KEY, WarrantyClaimId BIGINT NOT NULL, EventType NVARCHAR(50) NOT NULL, OldStatus NVARCHAR(30) NULL, NewStatus NVARCHAR(30) NULL, OldResolutionType NVARCHAR(20) NULL, NewResolutionType NVARCHAR(20) NULL, Remark NVARCHAR(2000) NULL, ChangedByUserId INT NULL, ChangedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaimHistory_ChangedAtUtc DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT FK_WebsiteWarrantyClaimHistory_Claim FOREIGN KEY(WarrantyClaimId) REFERENCES dbo.WebsiteWarrantyClaims(Id), CONSTRAINT FK_WebsiteWarrantyClaimHistory_ChangedBy FOREIGN KEY(ChangedByUserId) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteWarrantyClaimNotes', N'U') IS NULL
CREATE TABLE dbo.WebsiteWarrantyClaimNotes
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteWarrantyClaimNotes PRIMARY KEY, WarrantyClaimId BIGINT NOT NULL, Note NVARCHAR(4000) NOT NULL, CreatedByUserId INT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaimNotes_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT CK_WebsiteWarrantyClaimNotes_Note CHECK(LEN(LTRIM(RTRIM(Note)))>0), CONSTRAINT FK_WebsiteWarrantyClaimNotes_Claim FOREIGN KEY(WarrantyClaimId) REFERENCES dbo.WebsiteWarrantyClaims(Id), CONSTRAINT FK_WebsiteWarrantyClaimNotes_CreatedBy FOREIGN KEY(CreatedByUserId) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteWarrantyClaimCustomerMessages', N'U') IS NULL
CREATE TABLE dbo.WebsiteWarrantyClaimCustomerMessages
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteWarrantyClaimCustomerMessages PRIMARY KEY, WarrantyClaimId BIGINT NOT NULL, Message NVARCHAR(4000) NOT NULL, CreatedByUserId INT NOT NULL, CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteWarrantyClaimCustomerMessages_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
    CONSTRAINT CK_WebsiteWarrantyClaimCustomerMessages_Message CHECK(LEN(LTRIM(RTRIM(Message)))>0), CONSTRAINT FK_WebsiteWarrantyClaimCustomerMessages_Claim FOREIGN KEY(WarrantyClaimId) REFERENCES dbo.WebsiteWarrantyClaims(Id), CONSTRAINT FK_WebsiteWarrantyClaimCustomerMessages_CreatedBy FOREIGN KEY(CreatedByUserId) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteSettings', N'U') IS NULL
CREATE TABLE dbo.WebsiteSettings
(
    SettingKey NVARCHAR(100) NOT NULL CONSTRAINT PK_WebsiteSettings PRIMARY KEY, Value NVARCHAR(2000) NOT NULL, IsPublic BIT NOT NULL, UpdatedByUserId INT NULL, UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteSettings_UpdatedAtUtc DEFAULT(SYSUTCDATETIME()), CONSTRAINT FK_WebsiteSettings_UpdatedBy FOREIGN KEY(UpdatedByUserId) REFERENCES dbo.Users(Id)
);
GO
IF OBJECT_ID(N'dbo.WebsiteContactEnquiries', N'U') IS NULL
CREATE TABLE dbo.WebsiteContactEnquiries
(
    Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WebsiteContactEnquiries PRIMARY KEY, FirstName NVARCHAR(100) NOT NULL, LastName NVARCHAR(100) NOT NULL, Email NVARCHAR(254) NOT NULL, Subject NVARCHAR(200) NOT NULL, Message NVARCHAR(4000) NOT NULL, EnquiryType NVARCHAR(50) NOT NULL, Source NVARCHAR(100) NOT NULL, SubmittedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_WebsiteContactEnquiries_SubmittedAtUtc DEFAULT(SYSUTCDATETIME())
);
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteProducts') AND name=N'UX_WebsiteProducts_Code_Active') CREATE UNIQUE INDEX UX_WebsiteProducts_Code_Active ON dbo.WebsiteProducts(Code) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteProducts') AND name=N'IX_WebsiteProducts_Public') CREATE INDEX IX_WebsiteProducts_Public ON dbo.WebsiteProducts(PublishStatus,IsActive,SortOrder,Id) INCLUDE(Name,DisplayPrice,Rating,ReviewCount) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteProductBenefits') AND name=N'IX_WebsiteProductBenefits_Product') CREATE INDEX IX_WebsiteProductBenefits_Product ON dbo.WebsiteProductBenefits(WebsiteProductId,SortOrder,Id);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteProductMedia') AND name=N'IX_WebsiteProductMedia_Product') CREATE INDEX IX_WebsiteProductMedia_Product ON dbo.WebsiteProductMedia(WebsiteProductId,IsPrimary DESC,SortOrder,Id);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteBlogCategories') AND name=N'UX_WebsiteBlogCategories_Slug_Active') CREATE UNIQUE INDEX UX_WebsiteBlogCategories_Slug_Active ON dbo.WebsiteBlogCategories(Slug) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteBlogPosts') AND name=N'UX_WebsiteBlogPosts_Slug_Active') CREATE UNIQUE INDEX UX_WebsiteBlogPosts_Slug_Active ON dbo.WebsiteBlogPosts(Slug) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteBlogPosts') AND name=N'IX_WebsiteBlogPosts_Public') CREATE INDEX IX_WebsiteBlogPosts_Public ON dbo.WebsiteBlogPosts(PublishStatus,PublishedAtUtc DESC,SortOrder,Id) INCLUDE(Title,Slug,Excerpt,CoverImageUrl,ReadTime,CategoryId) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteAnnouncements') AND name=N'IX_WebsiteAnnouncements_Public') CREATE INDEX IX_WebsiteAnnouncements_Public ON dbo.WebsiteAnnouncements(Placement,IsActive,StartsAtUtc,EndsAtUtc,Priority DESC,SortOrder,Id) WHERE IsDeleted=0;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteWarrantyClaims') AND name=N'IX_WebsiteWarrantyClaims_List') CREATE INDEX IX_WebsiteWarrantyClaims_List ON dbo.WebsiteWarrantyClaims(Status,SubmittedAtUtc DESC,Id DESC) INCLUDE(ReferenceId,FullName,Email,OrderNumber,ResolutionType,AssignedToUserId,PurchaseDate);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteWarrantyClaimAttachments') AND name=N'IX_WebsiteWarrantyClaimAttachments_Claim') CREATE INDEX IX_WebsiteWarrantyClaimAttachments_Claim ON dbo.WebsiteWarrantyClaimAttachments(WarrantyClaimId,AttachmentType,Id);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.WebsiteWarrantyClaimHistory') AND name=N'IX_WebsiteWarrantyClaimHistory_Claim') CREATE INDEX IX_WebsiteWarrantyClaimHistory_Claim ON dbo.WebsiteWarrantyClaimHistory(WarrantyClaimId,ChangedAtUtc DESC,Id DESC);
GO

CREATE OR ALTER TRIGGER dbo.TR_WebsiteWarrantyClaimHistory_AppendOnly ON dbo.WebsiteWarrantyClaimHistory AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 52620, N'Website warranty claim history is append-only.', 1; END;
GO

/* Page names are part of the management API contract; System Owner access remains the existing application-level bypass. */
MERGE dbo.Pages AS target USING (VALUES(N'WebsiteManagement',N'Website Management',N'/website-management',N'globe-2',150)) source(Name,DisplayName,Route,Icon,SortOrder) ON target.Name=source.Name WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,SortOrder=source.SortOrder,IsActive=1 WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,source.SortOrder,1);
GO
DECLARE @WebsiteManagementParentId INT=(SELECT Id FROM dbo.Pages WHERE Name=N'WebsiteManagement');
MERGE dbo.Pages AS target USING (VALUES
 (N'WebsiteManagement.Dashboard',N'Website Dashboard',N'/website-management/dashboard',N'layout-dashboard',151),
 (N'WebsiteManagement.Products',N'Website Products',N'/website-management/products',N'package',152),
 (N'WebsiteManagement.Blogs',N'Website Blogs',N'/website-management/blogs',N'newspaper',153),
 (N'WebsiteManagement.Announcements',N'Website Announcements',N'/website-management/announcements',N'megaphone',154),
 (N'WebsiteManagement.WarrantyClaims',N'Website Warranty Claims',N'/website-management/warranty-claims',N'shield-check',155),
 (N'WebsiteManagement.Settings',N'Website Settings',N'/website-management/settings',N'settings',156),
 (N'WebsiteManagement.Media',N'Website Media',N'/website-management/media',N'image',157)
) source(Name,DisplayName,Route,Icon,SortOrder) ON target.Name=source.Name
WHEN MATCHED THEN UPDATE SET DisplayName=source.DisplayName,Route=source.Route,Icon=source.Icon,ParentPageId=@WebsiteManagementParentId,SortOrder=source.SortOrder,IsActive=1
WHEN NOT MATCHED THEN INSERT(Name,DisplayName,Route,Icon,ParentPageId,SortOrder,IsActive) VALUES(source.Name,source.DisplayName,source.Route,source.Icon,@WebsiteManagementParentId,source.SortOrder,1);
GO
MERGE dbo.RolePermissions AS target USING (SELECT r.Id RoleId,p.Id PageId,p.Name FROM dbo.Roles r CROSS JOIN dbo.Pages p WHERE r.Name=N'SuperAdmin' AND p.Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard',N'WebsiteManagement.Products',N'WebsiteManagement.Blogs',N'WebsiteManagement.Announcements',N'WebsiteManagement.WarrantyClaims',N'WebsiteManagement.Settings',N'WebsiteManagement.Media')) source ON target.RoleId=source.RoleId AND target.PageId=source.PageId
WHEN MATCHED THEN UPDATE SET CanView=1,CanCreate=CASE WHEN source.Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard') THEN 0 ELSE 1 END,CanEdit=CASE WHEN source.Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard',N'WebsiteManagement.Media') THEN 0 ELSE 1 END,CanDelete=CASE WHEN source.Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard',N'WebsiteManagement.Media',N'WebsiteManagement.WarrantyClaims',N'WebsiteManagement.Settings') THEN 0 ELSE 1 END,CanExport=CASE WHEN source.Name=N'WebsiteManagement.WarrantyClaims' THEN 1 ELSE 0 END,CanApprove=CASE WHEN source.Name=N'WebsiteManagement.WarrantyClaims' THEN 1 ELSE 0 END
WHEN NOT MATCHED THEN INSERT(RoleId,PageId,CanView,CanCreate,CanEdit,CanDelete,CanExport,CanApprove) VALUES(source.RoleId,source.PageId,1,CASE WHEN source.Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard') THEN 0 ELSE 1 END,CASE WHEN source.Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard',N'WebsiteManagement.Media') THEN 0 ELSE 1 END,CASE WHEN source.Name IN(N'WebsiteManagement',N'WebsiteManagement.Dashboard',N'WebsiteManagement.Media',N'WebsiteManagement.WarrantyClaims',N'WebsiteManagement.Settings') THEN 0 ELSE 1 END,CASE WHEN source.Name=N'WebsiteManagement.WarrantyClaims' THEN 1 ELSE 0 END,CASE WHEN source.Name=N'WebsiteManagement.WarrantyClaims' THEN 1 ELSE 0 END);
GO

CREATE OR ALTER PROCEDURE dbo.usp_WebsiteProduct_GetById @Id BIGINT AS
BEGIN
 SET NOCOUNT ON;
 SELECT p.Id,p.Code,p.Name,p.Description,p.DisplayPrice,p.CurrencyCode,p.Rating,p.ReviewCount,p.Badge,p.UrgencyText,p.Material,p.QuantityDisplay,p.IsUvResistant,p.IsRustProof,p.IsWindTested,p.WarrantyDisplay,p.AmazonUrl,p.BrandName,p.AvailabilityText,p.SortOrder,p.PublishStatus,p.IsActive,p.PublishedAtUtc,
        COALESCE((SELECT N'['+STRING_AGG(N'"'+STRING_ESCAPE(b.BenefitText,'json')+N'"',N',') WITHIN GROUP(ORDER BY b.SortOrder,b.Id)+N']' FROM dbo.WebsiteProductBenefits b WHERE b.WebsiteProductId=p.Id),N'[]') BenefitsJson,
        media.PublicUrl PrimaryImageUrl,CONVERT(VARBINARY(8),p.RowVersion) RowVersion
 FROM dbo.WebsiteProducts p OUTER APPLY(SELECT TOP(1) m.PublicUrl FROM dbo.WebsiteProductMedia m WHERE m.WebsiteProductId=p.Id ORDER BY m.IsPrimary DESC,m.SortOrder,m.Id) media WHERE p.Id=@Id AND p.IsDeleted=0;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteProduct_GetList @Search NVARCHAR(200)=NULL,@PublishStatus NVARCHAR(20)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(30)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize)); SET @Search=NULLIF(LTRIM(RTRIM(@Search)),N''); SET @PublishStatus=NULLIF(LTRIM(RTRIM(@PublishStatus)),N''); SET @SortBy=LOWER(NULLIF(LTRIM(RTRIM(@SortBy)),N'')); SET @SortDirection=LOWER(NULLIF(LTRIM(RTRIM(@SortDirection)),N''));
 SELECT p.Id,p.Code,p.Name,p.Description,p.DisplayPrice,p.CurrencyCode,p.Rating,p.ReviewCount,p.Badge,p.UrgencyText,p.Material,p.QuantityDisplay,p.IsUvResistant,p.IsRustProof,p.IsWindTested,p.WarrantyDisplay,p.AmazonUrl,p.BrandName,p.AvailabilityText,p.SortOrder,p.PublishStatus,p.IsActive,p.PublishedAtUtc,
        COALESCE((SELECT N'['+STRING_AGG(N'"'+STRING_ESCAPE(b.BenefitText,'json')+N'"',N',') WITHIN GROUP(ORDER BY b.SortOrder,b.Id)+N']' FROM dbo.WebsiteProductBenefits b WHERE b.WebsiteProductId=p.Id),N'[]') BenefitsJson,media.PublicUrl PrimaryImageUrl,CONVERT(VARBINARY(8),p.RowVersion) RowVersion,COUNT(1) OVER() TotalCount
 FROM dbo.WebsiteProducts p OUTER APPLY(SELECT TOP(1) m.PublicUrl FROM dbo.WebsiteProductMedia m WHERE m.WebsiteProductId=p.Id ORDER BY m.IsPrimary DESC,m.SortOrder,m.Id) media
 WHERE p.IsDeleted=0 AND (@PublishStatus IS NULL OR p.PublishStatus=@PublishStatus) AND (@IsActive IS NULL OR p.IsActive=@IsActive) AND (@Search IS NULL OR p.Code LIKE N'%'+@Search+N'%' OR p.Name LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN @SortBy=N'name' AND @SortDirection=N'asc' THEN p.Name END ASC,CASE WHEN @SortBy=N'name' AND @SortDirection=N'desc' THEN p.Name END DESC,CASE WHEN @SortBy=N'code' AND @SortDirection=N'asc' THEN p.Code END ASC,CASE WHEN @SortBy=N'code' AND @SortDirection=N'desc' THEN p.Code END DESC,CASE WHEN @SortBy=N'sortorder' AND @SortDirection=N'asc' THEN p.SortOrder END ASC,CASE WHEN @SortBy=N'sortorder' AND @SortDirection=N'desc' THEN p.SortOrder END DESC,CASE WHEN @SortBy=N'publishedatutc' AND @SortDirection=N'asc' THEN p.PublishedAtUtc END ASC,CASE WHEN @SortBy=N'publishedatutc' AND @SortDirection=N'desc' THEN p.PublishedAtUtc END DESC,CASE WHEN @SortBy IS NULL THEN p.SortOrder END ASC,CASE WHEN @SortBy IS NULL THEN p.Id END ASC,p.Id ASC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteProduct_GetPublic AS
BEGIN
 SET NOCOUNT ON;
 SELECT p.Id,p.Code,p.Name,p.Description,p.DisplayPrice,p.CurrencyCode,p.Rating,p.ReviewCount,p.Badge,p.UrgencyText,p.Material,p.QuantityDisplay,p.IsUvResistant,p.IsRustProof,p.IsWindTested,p.WarrantyDisplay,p.AmazonUrl,p.BrandName,p.AvailabilityText,p.SortOrder,p.PublishStatus,p.IsActive,p.PublishedAtUtc,
        COALESCE((SELECT N'['+STRING_AGG(N'"'+STRING_ESCAPE(b.BenefitText,'json')+N'"',N',') WITHIN GROUP(ORDER BY b.SortOrder,b.Id)+N']' FROM dbo.WebsiteProductBenefits b WHERE b.WebsiteProductId=p.Id),N'[]') BenefitsJson,media.PublicUrl PrimaryImageUrl
 FROM dbo.WebsiteProducts p OUTER APPLY(SELECT TOP(1) m.PublicUrl FROM dbo.WebsiteProductMedia m WHERE m.WebsiteProductId=p.Id ORDER BY m.IsPrimary DESC,m.SortOrder,m.Id) media WHERE p.IsDeleted=0 AND p.IsActive=1 AND p.PublishStatus=N'Published' AND p.PublishedAtUtc<=SYSUTCDATETIME() ORDER BY p.SortOrder,p.Id;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteProduct_Save
 @Id BIGINT=NULL,@Code NVARCHAR(100),@Name NVARCHAR(200),@Description NVARCHAR(4000)=NULL,@DisplayPrice DECIMAL(18,2)=NULL,@CurrencyCode CHAR(3)=N'INR',@Rating DECIMAL(3,2)=NULL,@ReviewCount INT=NULL,@Badge NVARCHAR(100)=NULL,@UrgencyText NVARCHAR(300)=NULL,@Material NVARCHAR(200)=NULL,@QuantityDisplay NVARCHAR(100)=NULL,@IsUvResistant BIT=NULL,@IsRustProof BIT=NULL,@IsWindTested BIT=NULL,@WarrantyDisplay NVARCHAR(100)=NULL,@AmazonUrl NVARCHAR(1000)=NULL,@BrandName NVARCHAR(200)=NULL,@AvailabilityText NVARCHAR(100)=NULL,@SortOrder INT=0,@PublishStatus NVARCHAR(20)=N'Draft',@IsActive BIT=1,@BenefitsJson NVARCHAR(MAX)=N'[]',@MediaJson NVARCHAR(MAX)=N'[]',@ExpectedRowVersion VARBINARY(8)=NULL,@CurrentUserId INT
AS BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @SavedId BIGINT,@ActualRowVersion VARBINARY(8);
 BEGIN TRY BEGIN TRANSACTION;
  IF @Id IS NOT NULL BEGIN SELECT @ActualRowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.WebsiteProducts WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0; IF @ActualRowVersion IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Website product was not found.' [Message]; RETURN; END; IF @ExpectedRowVersion IS NULL OR @ActualRowVersion<>@ExpectedRowVersion BEGIN ROLLBACK; SELECT 409 StatusCode,N'Website product has changed.' [Message]; RETURN; END; END;
  IF EXISTS(SELECT 1 FROM dbo.WebsiteProducts WHERE Code=@Code AND IsDeleted=0 AND Id<>ISNULL(@Id,0)) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Website product code already exists.' [Message]; RETURN; END;
  IF @Id IS NULL BEGIN INSERT dbo.WebsiteProducts(Code,Name,Description,DisplayPrice,CurrencyCode,Rating,ReviewCount,Badge,UrgencyText,Material,QuantityDisplay,IsUvResistant,IsRustProof,IsWindTested,WarrantyDisplay,AmazonUrl,BrandName,AvailabilityText,SortOrder,PublishStatus,IsActive,PublishedAtUtc,CreatedBy) VALUES(@Code,@Name,@Description,@DisplayPrice,@CurrencyCode,@Rating,@ReviewCount,@Badge,@UrgencyText,@Material,@QuantityDisplay,@IsUvResistant,@IsRustProof,@IsWindTested,@WarrantyDisplay,@AmazonUrl,@BrandName,@AvailabilityText,@SortOrder,@PublishStatus,@IsActive,CASE WHEN @PublishStatus=N'Published' THEN SYSUTCDATETIME() END,@CurrentUserId); SET @SavedId=SCOPE_IDENTITY(); END
  ELSE BEGIN UPDATE dbo.WebsiteProducts SET Code=@Code,Name=@Name,Description=@Description,DisplayPrice=@DisplayPrice,CurrencyCode=@CurrencyCode,Rating=@Rating,ReviewCount=@ReviewCount,Badge=@Badge,UrgencyText=@UrgencyText,Material=@Material,QuantityDisplay=@QuantityDisplay,IsUvResistant=@IsUvResistant,IsRustProof=@IsRustProof,IsWindTested=@IsWindTested,WarrantyDisplay=@WarrantyDisplay,AmazonUrl=@AmazonUrl,BrandName=@BrandName,AvailabilityText=@AvailabilityText,SortOrder=@SortOrder,PublishStatus=@PublishStatus,IsActive=@IsActive,PublishedAtUtc=CASE WHEN @PublishStatus=N'Published' THEN COALESCE(PublishedAtUtc,SYSUTCDATETIME()) ELSE NULL END,UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id; SET @SavedId=@Id; END;
  DELETE FROM dbo.WebsiteProductBenefits WHERE WebsiteProductId=@SavedId; INSERT dbo.WebsiteProductBenefits(WebsiteProductId,BenefitText,SortOrder) SELECT @SavedId,LTRIM(RTRIM(BenefitText)),ISNULL(SortOrder,0) FROM OPENJSON(ISNULL(@BenefitsJson,N'[]')) WITH(BenefitText NVARCHAR(500) '$.BenefitText',SortOrder INT '$.SortOrder') WHERE LEN(LTRIM(RTRIM(BenefitText)))>0;
  DELETE FROM dbo.WebsiteProductMedia WHERE WebsiteProductId=@SavedId; INSERT dbo.WebsiteProductMedia(WebsiteProductId,PublicUrl,AltText,SortOrder,IsPrimary,CreatedBy) SELECT @SavedId,LTRIM(RTRIM(PublicUrl)),NULLIF(LTRIM(RTRIM(AltText)),N''),ISNULL(SortOrder,0),ISNULL(IsPrimary,0),@CurrentUserId FROM OPENJSON(ISNULL(@MediaJson,N'[]')) WITH(PublicUrl NVARCHAR(1000) '$.PublicUrl',AltText NVARCHAR(500) '$.AltText',SortOrder INT '$.SortOrder',IsPrimary BIT '$.IsPrimary') WHERE LEN(LTRIM(RTRIM(PublicUrl)))>0;
  COMMIT; SELECT CASE WHEN @Id IS NULL THEN 201 ELSE 200 END StatusCode,CASE WHEN @Id IS NULL THEN N'Website product created.' ELSE N'Website product updated.' END [Message]; EXEC dbo.usp_WebsiteProduct_GetById @Id=@SavedId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteProduct_Delete @Id BIGINT,@CurrentUserId INT AS BEGIN SET NOCOUNT ON; UPDATE dbo.WebsiteProducts SET IsDeleted=1,DeletedBy=@CurrentUserId,DeletedAtUtc=SYSUTCDATETIME(),UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND IsDeleted=0; IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Website product was not found.' [Message]; ELSE SELECT 200 StatusCode,N'Website product deleted.' [Message]; END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogCategory_GetList AS
BEGIN SET NOCOUNT ON; SELECT Id,Name,Slug,Description,SortOrder,IsActive,CONVERT(VARBINARY(8),RowVersion) RowVersion FROM dbo.WebsiteBlogCategories WHERE IsDeleted=0 ORDER BY SortOrder,Name,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogCategory_GetPublic AS
BEGIN SET NOCOUNT ON; SELECT Id,Name,Slug,Description,SortOrder,IsActive FROM dbo.WebsiteBlogCategories WHERE IsDeleted=0 AND IsActive=1 ORDER BY SortOrder,Name,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogCategory_Save @Id BIGINT=NULL,@Name NVARCHAR(150),@Slug NVARCHAR(180),@Description NVARCHAR(1000)=NULL,@SortOrder INT=0,@IsActive BIT=1,@ExpectedRowVersion VARBINARY(8)=NULL,@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @RowVersion VARBINARY(8),@SavedId BIGINT;
 BEGIN TRY BEGIN TRANSACTION;
  IF @Id IS NOT NULL BEGIN SELECT @RowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.WebsiteBlogCategories WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0; IF @RowVersion IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Blog category was not found.' [Message]; RETURN; END; IF @ExpectedRowVersion IS NULL OR @RowVersion<>@ExpectedRowVersion BEGIN ROLLBACK; SELECT 409 StatusCode,N'Blog category has changed.' [Message]; RETURN; END; END;
  IF EXISTS(SELECT 1 FROM dbo.WebsiteBlogCategories WHERE Slug=@Slug AND IsDeleted=0 AND Id<>ISNULL(@Id,0)) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Blog category slug already exists.' [Message]; RETURN; END;
  IF @Id IS NULL BEGIN INSERT dbo.WebsiteBlogCategories(Name,Slug,Description,SortOrder,IsActive,CreatedBy) VALUES(@Name,@Slug,@Description,@SortOrder,@IsActive,@CurrentUserId); SET @SavedId=SCOPE_IDENTITY(); END ELSE BEGIN UPDATE dbo.WebsiteBlogCategories SET Name=@Name,Slug=@Slug,Description=@Description,SortOrder=@SortOrder,IsActive=@IsActive,UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id; SET @SavedId=@Id; END;
  COMMIT; SELECT CASE WHEN @Id IS NULL THEN 201 ELSE 200 END StatusCode,CASE WHEN @Id IS NULL THEN N'Blog category created.' ELSE N'Blog category updated.' END [Message]; SELECT Id,Name,Slug,Description,SortOrder,IsActive,CONVERT(VARBINARY(8),RowVersion) RowVersion FROM dbo.WebsiteBlogCategories WHERE Id=@SavedId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogCategory_Delete @Id BIGINT,@CurrentUserId INT AS
BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM dbo.WebsiteBlogPosts WHERE CategoryId=@Id AND IsDeleted=0) BEGIN SELECT 409 StatusCode,N'Blog category is in use by blog posts.' [Message]; RETURN; END; UPDATE dbo.WebsiteBlogCategories SET IsDeleted=1,DeletedBy=@CurrentUserId,DeletedAtUtc=SYSUTCDATETIME(),UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND IsDeleted=0; IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Blog category was not found.' [Message]; ELSE SELECT 200 StatusCode,N'Blog category deleted.' [Message]; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogPost_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON; SELECT p.Id,p.Title,p.Slug,p.Excerpt,p.Content,p.CoverImageUrl,p.ReadTime,p.CategoryId,c.Name CategoryName,p.PublishStatus,p.PublishedAtUtc,p.SeoTitle,p.SeoDescription,p.OpenGraphImageUrl,p.IsFeatured,p.SortOrder,CONVERT(VARBINARY(8),p.RowVersion) RowVersion FROM dbo.WebsiteBlogPosts p INNER JOIN dbo.WebsiteBlogCategories c ON c.Id=p.CategoryId WHERE p.Id=@Id AND p.IsDeleted=0; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogPost_GetList @Search NVARCHAR(200)=NULL,@CategoryId BIGINT=NULL,@PublishStatus NVARCHAR(20)=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(30)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize)); SET @Search=NULLIF(LTRIM(RTRIM(@Search)),N''); SET @PublishStatus=NULLIF(LTRIM(RTRIM(@PublishStatus)),N''); SET @SortBy=LOWER(NULLIF(LTRIM(RTRIM(@SortBy)),N'')); SET @SortDirection=LOWER(NULLIF(LTRIM(RTRIM(@SortDirection)),N''));
 SELECT p.Id,p.Title,p.Slug,p.Excerpt,p.Content,p.CoverImageUrl,p.ReadTime,p.CategoryId,c.Name CategoryName,p.PublishStatus,p.PublishedAtUtc,p.SeoTitle,p.SeoDescription,p.OpenGraphImageUrl,p.IsFeatured,p.SortOrder,CONVERT(VARBINARY(8),p.RowVersion) RowVersion,COUNT(1) OVER() TotalCount FROM dbo.WebsiteBlogPosts p INNER JOIN dbo.WebsiteBlogCategories c ON c.Id=p.CategoryId WHERE p.IsDeleted=0 AND (@CategoryId IS NULL OR p.CategoryId=@CategoryId) AND (@PublishStatus IS NULL OR p.PublishStatus=@PublishStatus) AND (@Search IS NULL OR p.Title LIKE N'%'+@Search+N'%' OR p.Slug LIKE N'%'+@Search+N'%' OR p.Excerpt LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN @SortBy=N'title' AND @SortDirection=N'asc' THEN p.Title END ASC,CASE WHEN @SortBy=N'title' AND @SortDirection=N'desc' THEN p.Title END DESC,CASE WHEN @SortBy=N'slug' AND @SortDirection=N'asc' THEN p.Slug END ASC,CASE WHEN @SortBy=N'slug' AND @SortDirection=N'desc' THEN p.Slug END DESC,CASE WHEN @SortBy=N'publishedatutc' AND @SortDirection=N'asc' THEN p.PublishedAtUtc END ASC,CASE WHEN @SortBy=N'publishedatutc' AND @SortDirection=N'desc' THEN p.PublishedAtUtc END DESC,CASE WHEN @SortBy=N'sortorder' AND @SortDirection=N'asc' THEN p.SortOrder END ASC,CASE WHEN @SortBy=N'sortorder' AND @SortDirection=N'desc' THEN p.SortOrder END DESC,CASE WHEN @SortBy IS NULL THEN p.PublishedAtUtc END DESC,CASE WHEN @SortBy IS NULL THEN p.SortOrder END ASC,p.Id DESC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogPost_GetPublicList AS
BEGIN SET NOCOUNT ON; SELECT p.Id,p.Title,p.Slug,p.Excerpt,p.Content,p.CoverImageUrl,p.ReadTime,p.CategoryId,c.Name CategoryName,p.PublishStatus,p.PublishedAtUtc,p.SeoTitle,p.SeoDescription,p.OpenGraphImageUrl,p.IsFeatured,p.SortOrder FROM dbo.WebsiteBlogPosts p INNER JOIN dbo.WebsiteBlogCategories c ON c.Id=p.CategoryId WHERE p.IsDeleted=0 AND p.PublishStatus=N'Published' AND p.PublishedAtUtc<=SYSUTCDATETIME() AND c.IsDeleted=0 AND c.IsActive=1 ORDER BY p.PublishedAtUtc DESC,p.SortOrder,p.Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogPost_GetPublicBySlug @Slug NVARCHAR(220) AS
BEGIN SET NOCOUNT ON; SELECT p.Id,p.Title,p.Slug,p.Excerpt,p.Content,p.CoverImageUrl,p.ReadTime,p.CategoryId,c.Name CategoryName,p.PublishStatus,p.PublishedAtUtc,p.SeoTitle,p.SeoDescription,p.OpenGraphImageUrl,p.IsFeatured,p.SortOrder FROM dbo.WebsiteBlogPosts p INNER JOIN dbo.WebsiteBlogCategories c ON c.Id=p.CategoryId WHERE p.Slug=@Slug AND p.IsDeleted=0 AND p.PublishStatus=N'Published' AND p.PublishedAtUtc<=SYSUTCDATETIME() AND c.IsDeleted=0 AND c.IsActive=1; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogPost_Save @Id BIGINT=NULL,@Title NVARCHAR(250),@Slug NVARCHAR(220),@Excerpt NVARCHAR(1000),@Content NVARCHAR(MAX),@CoverImageUrl NVARCHAR(1000)=NULL,@ReadTime NVARCHAR(50),@CategoryId BIGINT,@PublishStatus NVARCHAR(20),@PublishedAtUtc DATETIME2(3)=NULL,@SeoTitle NVARCHAR(250)=NULL,@SeoDescription NVARCHAR(500)=NULL,@OpenGraphImageUrl NVARCHAR(1000)=NULL,@IsFeatured BIT=0,@SortOrder INT=0,@ExpectedRowVersion VARBINARY(8)=NULL,@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @RowVersion VARBINARY(8),@SavedId BIGINT;
 BEGIN TRY BEGIN TRANSACTION;
  IF NOT EXISTS(SELECT 1 FROM dbo.WebsiteBlogCategories WHERE Id=@CategoryId AND IsDeleted=0) BEGIN ROLLBACK; SELECT 400 StatusCode,N'Blog category is invalid.' [Message]; RETURN; END;
  IF @Id IS NOT NULL BEGIN SELECT @RowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.WebsiteBlogPosts WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0; IF @RowVersion IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Blog post was not found.' [Message]; RETURN; END; IF @ExpectedRowVersion IS NULL OR @RowVersion<>@ExpectedRowVersion BEGIN ROLLBACK; SELECT 409 StatusCode,N'Blog post has changed.' [Message]; RETURN; END; END;
  IF EXISTS(SELECT 1 FROM dbo.WebsiteBlogPosts WHERE Slug=@Slug AND IsDeleted=0 AND Id<>ISNULL(@Id,0)) BEGIN ROLLBACK; SELECT 409 StatusCode,N'Blog post slug already exists.' [Message]; RETURN; END;
  IF @PublishStatus=N'Published' SET @PublishedAtUtc=COALESCE(@PublishedAtUtc,SYSUTCDATETIME()); ELSE SET @PublishedAtUtc=NULL;
  IF @Id IS NULL BEGIN INSERT dbo.WebsiteBlogPosts(Title,Slug,Excerpt,Content,CoverImageUrl,ReadTime,CategoryId,PublishStatus,PublishedAtUtc,SeoTitle,SeoDescription,OpenGraphImageUrl,IsFeatured,SortOrder,CreatedBy) VALUES(@Title,@Slug,@Excerpt,@Content,@CoverImageUrl,@ReadTime,@CategoryId,@PublishStatus,@PublishedAtUtc,@SeoTitle,@SeoDescription,@OpenGraphImageUrl,@IsFeatured,@SortOrder,@CurrentUserId); SET @SavedId=SCOPE_IDENTITY(); END ELSE BEGIN UPDATE dbo.WebsiteBlogPosts SET Title=@Title,Slug=@Slug,Excerpt=@Excerpt,Content=@Content,CoverImageUrl=@CoverImageUrl,ReadTime=@ReadTime,CategoryId=@CategoryId,PublishStatus=@PublishStatus,PublishedAtUtc=@PublishedAtUtc,SeoTitle=@SeoTitle,SeoDescription=@SeoDescription,OpenGraphImageUrl=@OpenGraphImageUrl,IsFeatured=@IsFeatured,SortOrder=@SortOrder,UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id; SET @SavedId=@Id; END;
  COMMIT; SELECT CASE WHEN @Id IS NULL THEN 201 ELSE 200 END StatusCode,CASE WHEN @Id IS NULL THEN N'Blog post created.' ELSE N'Blog post updated.' END [Message]; EXEC dbo.usp_WebsiteBlogPost_GetById @Id=@SavedId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteBlogPost_Delete @Id BIGINT,@CurrentUserId INT AS BEGIN SET NOCOUNT ON; UPDATE dbo.WebsiteBlogPosts SET IsDeleted=1,DeletedBy=@CurrentUserId,DeletedAtUtc=SYSUTCDATETIME(),UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND IsDeleted=0; IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Blog post was not found.' [Message]; ELSE SELECT 200 StatusCode,N'Blog post deleted.' [Message]; END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WebsiteAnnouncement_GetList @Placement NVARCHAR(30)=NULL,@IsActive BIT=NULL,@PageNumber INT=1,@PageSize INT=20 AS
BEGIN SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize)); SET @Placement=NULLIF(LTRIM(RTRIM(@Placement)),N''); SELECT Id,Title,Message,Placement,CtaLabel,CtaUrl,Priority,StartsAtUtc,EndsAtUtc,IsActive,DismissalVersion,SortOrder,CONVERT(VARBINARY(8),RowVersion) RowVersion,COUNT(1) OVER() TotalCount FROM dbo.WebsiteAnnouncements WHERE IsDeleted=0 AND (@Placement IS NULL OR Placement=@Placement) AND (@IsActive IS NULL OR IsActive=@IsActive) ORDER BY Priority DESC,SortOrder,Id OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteAnnouncement_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON; SELECT Id,Title,Message,Placement,CtaLabel,CtaUrl,Priority,StartsAtUtc,EndsAtUtc,IsActive,DismissalVersion,SortOrder,CONVERT(VARBINARY(8),RowVersion) RowVersion FROM dbo.WebsiteAnnouncements WHERE Id=@Id AND IsDeleted=0; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteAnnouncement_GetPublic @Placement NVARCHAR(30) AS
BEGIN SET NOCOUNT ON; SELECT Id,Title,Message,Placement,CtaLabel,CtaUrl,Priority,StartsAtUtc,EndsAtUtc,IsActive,DismissalVersion,SortOrder FROM dbo.WebsiteAnnouncements WHERE IsDeleted=0 AND IsActive=1 AND Placement=@Placement AND (StartsAtUtc IS NULL OR StartsAtUtc<=SYSUTCDATETIME()) AND (EndsAtUtc IS NULL OR EndsAtUtc>SYSUTCDATETIME()) ORDER BY Priority DESC,SortOrder,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteAnnouncement_Save @Id BIGINT=NULL,@Title NVARCHAR(200)=NULL,@Message NVARCHAR(1000),@Placement NVARCHAR(30),@CtaLabel NVARCHAR(100)=NULL,@CtaUrl NVARCHAR(1000)=NULL,@Priority INT=0,@StartsAtUtc DATETIME2(3)=NULL,@EndsAtUtc DATETIME2(3)=NULL,@IsActive BIT=1,@DismissalVersion NVARCHAR(50)=N'1',@SortOrder INT=0,@ExpectedRowVersion VARBINARY(8)=NULL,@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @RowVersion VARBINARY(8),@SavedId BIGINT;
 BEGIN TRY BEGIN TRANSACTION;
  IF @Id IS NOT NULL BEGIN SELECT @RowVersion=CONVERT(VARBINARY(8),RowVersion) FROM dbo.WebsiteAnnouncements WITH(UPDLOCK,HOLDLOCK) WHERE Id=@Id AND IsDeleted=0; IF @RowVersion IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Website announcement was not found.' [Message]; RETURN; END; IF @ExpectedRowVersion IS NULL OR @RowVersion<>@ExpectedRowVersion BEGIN ROLLBACK; SELECT 409 StatusCode,N'Website announcement has changed.' [Message]; RETURN; END; END;
  IF @StartsAtUtc IS NOT NULL AND @EndsAtUtc IS NOT NULL AND @StartsAtUtc>=@EndsAtUtc BEGIN ROLLBACK; SELECT 400 StatusCode,N'Announcement start must be before end.' [Message]; RETURN; END;
  IF @Id IS NULL BEGIN INSERT dbo.WebsiteAnnouncements(Title,Message,Placement,CtaLabel,CtaUrl,Priority,StartsAtUtc,EndsAtUtc,IsActive,DismissalVersion,SortOrder,CreatedBy) VALUES(@Title,@Message,@Placement,@CtaLabel,@CtaUrl,@Priority,@StartsAtUtc,@EndsAtUtc,@IsActive,@DismissalVersion,@SortOrder,@CurrentUserId); SET @SavedId=SCOPE_IDENTITY(); END ELSE BEGIN UPDATE dbo.WebsiteAnnouncements SET Title=@Title,Message=@Message,Placement=@Placement,CtaLabel=@CtaLabel,CtaUrl=@CtaUrl,Priority=@Priority,StartsAtUtc=@StartsAtUtc,EndsAtUtc=@EndsAtUtc,IsActive=@IsActive,DismissalVersion=@DismissalVersion,SortOrder=@SortOrder,UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id; SET @SavedId=@Id; END;
  COMMIT; SELECT CASE WHEN @Id IS NULL THEN 201 ELSE 200 END StatusCode,CASE WHEN @Id IS NULL THEN N'Website announcement created.' ELSE N'Website announcement updated.' END [Message]; SELECT Id,Title,Message,Placement,CtaLabel,CtaUrl,Priority,StartsAtUtc,EndsAtUtc,IsActive,DismissalVersion,SortOrder,CONVERT(VARBINARY(8),RowVersion) RowVersion FROM dbo.WebsiteAnnouncements WHERE Id=@SavedId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteAnnouncement_Delete @Id BIGINT,@CurrentUserId INT AS BEGIN SET NOCOUNT ON; UPDATE dbo.WebsiteAnnouncements SET IsDeleted=1,DeletedBy=@CurrentUserId,DeletedAtUtc=SYSUTCDATETIME(),UpdatedBy=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@Id AND IsDeleted=0; IF @@ROWCOUNT=0 SELECT 404 StatusCode,N'Website announcement was not found.' [Message]; ELSE SELECT 200 StatusCode,N'Website announcement deleted.' [Message]; END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_CreatePublic @FullName NVARCHAR(100),@Email NVARCHAR(254),@OrderNumber NVARCHAR(100),@PurchaseDate DATE,@Description NVARCHAR(2000),@Source NVARCHAR(100),@Consent BIT,@AttachmentsJson NVARCHAR(MAX) AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @Year INT=YEAR(SYSUTCDATETIME()),@Number INT,@ReferenceId NVARCHAR(30),@ClaimId BIGINT;
 BEGIN TRY BEGIN TRANSACTION;
  IF NOT EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaimSequences WITH(UPDLOCK,HOLDLOCK) WHERE ClaimYear=@Year) INSERT dbo.WebsiteWarrantyClaimSequences(ClaimYear,NextNumber) VALUES(@Year,1);
  SELECT @Number=NextNumber FROM dbo.WebsiteWarrantyClaimSequences WITH(UPDLOCK,HOLDLOCK) WHERE ClaimYear=@Year; UPDATE dbo.WebsiteWarrantyClaimSequences SET NextNumber=NextNumber+1 WHERE ClaimYear=@Year; SET @ReferenceId=N'WC-'+CONVERT(NVARCHAR(4),@Year)+N'-'+RIGHT(N'000000'+CONVERT(NVARCHAR(6),@Number),6);
  INSERT dbo.WebsiteWarrantyClaims(ReferenceId,FullName,Email,OrderNumber,PurchaseDate,Description,Source,ConsentAccepted,ConsentAcceptedAtUtc) VALUES(@ReferenceId,@FullName,@Email,@OrderNumber,@PurchaseDate,@Description,@Source,@Consent,SYSUTCDATETIME()); SET @ClaimId=SCOPE_IDENTITY();
  INSERT dbo.WebsiteWarrantyClaimAttachments(WarrantyClaimId,AttachmentType,OriginalFileName,StorageKey,DetectedMimeType,SizeBytes,ScanStatus)
  SELECT @ClaimId,CASE WHEN TRY_CONVERT(INT,JSON_VALUE(j.value,'$.AttachmentType'))=0 THEN N'Invoice' ELSE N'ProductDamageImage' END,JSON_VALUE(j.value,'$.OriginalFileName'),JSON_VALUE(j.value,'$.StorageKey'),JSON_VALUE(j.value,'$.DetectedMimeType'),TRY_CONVERT(BIGINT,JSON_VALUE(j.value,'$.SizeBytes')),N'Pending' FROM OPENJSON(@AttachmentsJson) j;
  IF (SELECT COUNT(*) FROM dbo.WebsiteWarrantyClaimAttachments WHERE WarrantyClaimId=@ClaimId AND AttachmentType=N'Invoice')<>1 OR (SELECT COUNT(*) FROM dbo.WebsiteWarrantyClaimAttachments WHERE WarrantyClaimId=@ClaimId AND AttachmentType=N'ProductDamageImage') NOT BETWEEN 1 AND 5 BEGIN ROLLBACK; SELECT 400 StatusCode,N'Warranty attachments are invalid.' [Message]; RETURN; END;
  INSERT dbo.WebsiteWarrantyClaimHistory(WarrantyClaimId,EventType,NewStatus,Remark,ChangedByUserId) VALUES(@ClaimId,N'ClaimSubmitted',N'Submitted',N'Public website submission',NULL);
  COMMIT; SELECT 201 StatusCode,N'Warranty claim submitted.' [Message]; SELECT N'Warranty claim submitted.' Message,@ReferenceId ReferenceId;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetList @Search NVARCHAR(200)=NULL,@Status NVARCHAR(30)=NULL,@ResolutionType NVARCHAR(20)=NULL,@AssignedToUserId INT=NULL,@SubmittedFromUtc DATETIME2(3)=NULL,@SubmittedToUtc DATETIME2(3)=NULL,@PurchaseDateFrom DATE=NULL,@PurchaseDateTo DATE=NULL,@PageNumber INT=1,@PageSize INT=20,@SortBy NVARCHAR(30)=NULL,@SortDirection NVARCHAR(4)=NULL AS
BEGIN
 SET NOCOUNT ON; SET @PageNumber=IIF(@PageNumber<1,1,@PageNumber); SET @PageSize=IIF(@PageSize<1,20,IIF(@PageSize>200,200,@PageSize)); SET @Search=NULLIF(LTRIM(RTRIM(@Search)),N''); SET @Status=NULLIF(LTRIM(RTRIM(@Status)),N''); SET @ResolutionType=NULLIF(LTRIM(RTRIM(@ResolutionType)),N''); SET @SortBy=LOWER(NULLIF(LTRIM(RTRIM(@SortBy)),N'')); SET @SortDirection=ISNULL(LOWER(NULLIF(LTRIM(RTRIM(@SortDirection)),N'')),N'desc');
 SELECT c.Id,c.ReferenceId,c.FullName,c.Email,c.OrderNumber,c.PurchaseDate,c.Status,c.ResolutionType,c.AssignedToUserId,u.FullName AssignedToUserName,c.SubmittedAtUtc,c.UpdatedAtUtc,COUNT(1) OVER() TotalCount FROM dbo.WebsiteWarrantyClaims c LEFT JOIN dbo.Users u ON u.Id=c.AssignedToUserId
 WHERE (@Status IS NULL OR c.Status=@Status) AND (@ResolutionType IS NULL OR c.ResolutionType=@ResolutionType) AND (@AssignedToUserId IS NULL OR c.AssignedToUserId=@AssignedToUserId) AND (@SubmittedFromUtc IS NULL OR c.SubmittedAtUtc>=@SubmittedFromUtc) AND (@SubmittedToUtc IS NULL OR c.SubmittedAtUtc<=@SubmittedToUtc) AND (@PurchaseDateFrom IS NULL OR c.PurchaseDate>=@PurchaseDateFrom) AND (@PurchaseDateTo IS NULL OR c.PurchaseDate<=@PurchaseDateTo) AND (@Search IS NULL OR c.ReferenceId LIKE N'%'+@Search+N'%' OR c.FullName LIKE N'%'+@Search+N'%' OR c.Email LIKE N'%'+@Search+N'%' OR c.OrderNumber LIKE N'%'+@Search+N'%')
 ORDER BY CASE WHEN @SortBy=N'referenceid' AND @SortDirection=N'asc' THEN c.ReferenceId END ASC,CASE WHEN @SortBy=N'referenceid' AND @SortDirection=N'desc' THEN c.ReferenceId END DESC,CASE WHEN @SortBy=N'status' AND @SortDirection=N'asc' THEN c.Status END ASC,CASE WHEN @SortBy=N'status' AND @SortDirection=N'desc' THEN c.Status END DESC,CASE WHEN @SortBy=N'purchasedate' AND @SortDirection=N'asc' THEN c.PurchaseDate END ASC,CASE WHEN @SortBy=N'purchasedate' AND @SortDirection=N'desc' THEN c.PurchaseDate END DESC,CASE WHEN @SortBy=N'updatedatutc' AND @SortDirection=N'asc' THEN c.UpdatedAtUtc END ASC,CASE WHEN @SortBy=N'updatedatutc' AND @SortDirection=N'desc' THEN c.UpdatedAtUtc END DESC,CASE WHEN (@SortBy IS NULL OR @SortBy=N'submittedatutc') AND @SortDirection=N'asc' THEN c.SubmittedAtUtc END ASC,CASE WHEN (@SortBy IS NULL OR @SortBy=N'submittedatutc') AND @SortDirection=N'desc' THEN c.SubmittedAtUtc END DESC,c.Id DESC OFFSET(@PageNumber-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetById @Id BIGINT AS
BEGIN SET NOCOUNT ON; SELECT c.Id,c.ReferenceId,c.FullName,c.Email,c.OrderNumber,c.PurchaseDate,c.Description,c.Source,c.ConsentAccepted,c.ConsentAcceptedAtUtc,c.WebsiteProductId,c.Status,c.ResolutionType,c.AssignedToUserId,u.FullName AssignedToUserName,c.RefundAmount,c.RefundReference,c.ReplacementReference,c.ReplacementTrackingNumber,c.RepairReference,c.ResolutionRemarks,c.SubmittedAtUtc,c.ReviewedAtUtc,c.ResolvedAtUtc,c.CompletedAtUtc,c.UpdatedAtUtc FROM dbo.WebsiteWarrantyClaims c LEFT JOIN dbo.Users u ON u.Id=c.AssignedToUserId WHERE c.Id=@Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetAttachments @ClaimId BIGINT AS
BEGIN SET NOCOUNT ON; SELECT Id,WarrantyClaimId,AttachmentType,OriginalFileName,DetectedMimeType,SizeBytes,ScanStatus,CreatedAtUtc FROM dbo.WebsiteWarrantyClaimAttachments WHERE WarrantyClaimId=@ClaimId ORDER BY CASE AttachmentType WHEN N'Invoice' THEN 0 ELSE 1 END,Id; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetAttachmentDownload @AttachmentId BIGINT AS
BEGIN SET NOCOUNT ON; SELECT Id,StorageKey,OriginalFileName,DetectedMimeType FROM dbo.WebsiteWarrantyClaimAttachments WHERE Id=@AttachmentId AND ScanStatus<>N'Rejected'; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetHistory @ClaimId BIGINT AS
BEGIN SET NOCOUNT ON; SELECT h.Id,h.WarrantyClaimId,h.EventType,h.OldStatus,h.NewStatus,h.OldResolutionType,h.NewResolutionType,h.Remark,h.ChangedByUserId,u.FullName ChangedByName,h.ChangedAtUtc FROM dbo.WebsiteWarrantyClaimHistory h LEFT JOIN dbo.Users u ON u.Id=h.ChangedByUserId WHERE h.WarrantyClaimId=@ClaimId ORDER BY h.ChangedAtUtc DESC,h.Id DESC; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetNotes @ClaimId BIGINT AS
BEGIN SET NOCOUNT ON; SELECT n.Id,n.WarrantyClaimId,n.Note,n.CreatedByUserId,u.FullName CreatedByName,n.CreatedAtUtc FROM dbo.WebsiteWarrantyClaimNotes n INNER JOIN dbo.Users u ON u.Id=n.CreatedByUserId WHERE n.WarrantyClaimId=@ClaimId ORDER BY n.CreatedAtUtc DESC,n.Id DESC; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetCustomerMessages @ClaimId BIGINT AS
BEGIN SET NOCOUNT ON; SELECT m.Id,m.WarrantyClaimId,m.Message,m.CreatedByUserId,u.FullName CreatedByName,m.CreatedAtUtc FROM dbo.WebsiteWarrantyClaimCustomerMessages m INNER JOIN dbo.Users u ON u.Id=m.CreatedByUserId WHERE m.WarrantyClaimId=@ClaimId ORDER BY m.CreatedAtUtc DESC,m.Id DESC; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_Assign @ClaimId BIGINT,@AssignedToUserId INT=NULL,@Remark NVARCHAR(2000)=NULL,@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @OldAssigned INT;
 BEGIN TRY BEGIN TRANSACTION; SELECT @OldAssigned=AssignedToUserId FROM dbo.WebsiteWarrantyClaims WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ClaimId; IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 404 StatusCode,N'Warranty claim was not found.' [Message]; RETURN; END; IF @AssignedToUserId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@AssignedToUserId AND IsActive=1 AND IsDeleted=0) BEGIN ROLLBACK; SELECT 400 StatusCode,N'Assigned user is invalid.' [Message]; RETURN; END; UPDATE dbo.WebsiteWarrantyClaims SET AssignedToUserId=@AssignedToUserId,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ClaimId; INSERT dbo.WebsiteWarrantyClaimHistory(WarrantyClaimId,EventType,Remark,ChangedByUserId) VALUES(@ClaimId,CASE WHEN @AssignedToUserId IS NULL THEN N'Unassigned' ELSE N'Assigned' END,@Remark,@CurrentUserId); COMMIT; SELECT 200 StatusCode,N'Warranty claim assignment updated.' [Message]; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_Transition @ClaimId BIGINT,@TargetStatus NVARCHAR(30),@Remark NVARCHAR(2000)=NULL,@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @OldStatus NVARCHAR(30),@OldResolution NVARCHAR(20);
 BEGIN TRY BEGIN TRANSACTION; SELECT @OldStatus=Status,@OldResolution=ResolutionType FROM dbo.WebsiteWarrantyClaims WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ClaimId; IF @OldStatus IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Warranty claim was not found.' [Message]; RETURN; END;
  IF NOT((@OldStatus=N'Submitted' AND @TargetStatus=N'UnderReview') OR (@OldStatus=N'UnderReview' AND @TargetStatus IN(N'NeedMoreInformation',N'Approved',N'Rejected')) OR (@OldStatus=N'NeedMoreInformation' AND @TargetStatus=N'UnderReview') OR (@OldStatus=N'Approved' AND @TargetStatus=N'Completed')) BEGIN ROLLBACK; SELECT 400 StatusCode,N'Warranty claim status transition is invalid.' [Message]; RETURN; END;
  IF @TargetStatus=N'Completed' AND @OldResolution IS NULL BEGIN ROLLBACK; SELECT 400 StatusCode,N'A resolution is required before a claim can be completed.' [Message]; RETURN; END;
  UPDATE dbo.WebsiteWarrantyClaims SET Status=@TargetStatus,ReviewedAtUtc=CASE WHEN @TargetStatus=N'UnderReview' THEN COALESCE(ReviewedAtUtc,SYSUTCDATETIME()) ELSE ReviewedAtUtc END,CompletedAtUtc=CASE WHEN @TargetStatus=N'Completed' THEN SYSUTCDATETIME() ELSE CompletedAtUtc END,UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ClaimId;
  INSERT dbo.WebsiteWarrantyClaimHistory(WarrantyClaimId,EventType,OldStatus,NewStatus,OldResolutionType,NewResolutionType,Remark,ChangedByUserId) VALUES(@ClaimId,CASE @TargetStatus WHEN N'Approved' THEN N'Approved' WHEN N'Rejected' THEN N'Rejected' WHEN N'NeedMoreInformation' THEN N'NeedMoreInformationRequested' WHEN N'Completed' THEN N'Completed' ELSE N'StatusChanged' END,@OldStatus,@TargetStatus,@OldResolution,@OldResolution,@Remark,@CurrentUserId);
  COMMIT; SELECT 200 StatusCode,N'Warranty claim status updated.' [Message]; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_Resolve @ClaimId BIGINT,@ResolutionType NVARCHAR(20),@RefundAmount DECIMAL(18,2)=NULL,@RefundReference NVARCHAR(200)=NULL,@ReplacementReference NVARCHAR(200)=NULL,@ReplacementTrackingNumber NVARCHAR(200)=NULL,@RepairReference NVARCHAR(200)=NULL,@ResolutionRemarks NVARCHAR(2000)=NULL,@Remark NVARCHAR(2000)=NULL,@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON; DECLARE @Status NVARCHAR(30),@OldResolution NVARCHAR(20);
 BEGIN TRY BEGIN TRANSACTION; SELECT @Status=Status,@OldResolution=ResolutionType FROM dbo.WebsiteWarrantyClaims WITH(UPDLOCK,HOLDLOCK) WHERE Id=@ClaimId; IF @Status IS NULL BEGIN ROLLBACK; SELECT 404 StatusCode,N'Warranty claim was not found.' [Message]; RETURN; END; IF @Status<>N'Approved' BEGIN ROLLBACK; SELECT 400 StatusCode,N'Only approved claims can receive a resolution.' [Message]; RETURN; END; IF @ResolutionType=N'Refund' AND (@RefundAmount IS NULL OR @RefundAmount<=0 OR NULLIF(LTRIM(RTRIM(@RefundReference)),N'') IS NULL) BEGIN ROLLBACK; SELECT 400 StatusCode,N'Refund amount and reference are required.' [Message]; RETURN; END; IF @ResolutionType=N'Replacement' AND NULLIF(LTRIM(RTRIM(@ReplacementReference)),N'') IS NULL BEGIN ROLLBACK; SELECT 400 StatusCode,N'Replacement reference is required.' [Message]; RETURN; END; IF @ResolutionType=N'Repair' AND NULLIF(LTRIM(RTRIM(@RepairReference)),N'') IS NULL BEGIN ROLLBACK; SELECT 400 StatusCode,N'Repair reference is required.' [Message]; RETURN; END;
 UPDATE dbo.WebsiteWarrantyClaims SET ResolutionType=@ResolutionType,RefundAmount=@RefundAmount,RefundReference=@RefundReference,ReplacementReference=@ReplacementReference,ReplacementTrackingNumber=@ReplacementTrackingNumber,RepairReference=@RepairReference,ResolutionRemarks=@ResolutionRemarks,ResolvedAtUtc=SYSUTCDATETIME(),UpdatedAtUtc=SYSUTCDATETIME() WHERE Id=@ClaimId;
 INSERT dbo.WebsiteWarrantyClaimHistory(WarrantyClaimId,EventType,OldStatus,NewStatus,OldResolutionType,NewResolutionType,Remark,ChangedByUserId) VALUES(@ClaimId,N'ResolutionSet',@Status,@Status,@OldResolution,@ResolutionType,@Remark,@CurrentUserId); COMMIT; SELECT 200 StatusCode,N'Warranty resolution saved.' [Message]; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_AddNote @ClaimId BIGINT,@Note NVARCHAR(4000),@CurrentUserId INT AS
BEGIN SET NOCOUNT ON; IF NOT EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaims WHERE Id=@ClaimId) BEGIN SELECT 404 StatusCode,N'Warranty claim was not found.' [Message]; RETURN; END; INSERT dbo.WebsiteWarrantyClaimNotes(WarrantyClaimId,Note,CreatedByUserId) VALUES(@ClaimId,@Note,@CurrentUserId); INSERT dbo.WebsiteWarrantyClaimHistory(WarrantyClaimId,EventType,Remark,ChangedByUserId) VALUES(@ClaimId,N'InternalNoteAdded',N'Internal note added.',@CurrentUserId); SELECT 201 StatusCode,N'Internal note added.' [Message]; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_AddCustomerMessage @ClaimId BIGINT,@Message NVARCHAR(4000),@CurrentUserId INT AS
BEGIN SET NOCOUNT ON; IF NOT EXISTS(SELECT 1 FROM dbo.WebsiteWarrantyClaims WHERE Id=@ClaimId) BEGIN SELECT 404 StatusCode,N'Warranty claim was not found.' [Message]; RETURN; END; INSERT dbo.WebsiteWarrantyClaimCustomerMessages(WarrantyClaimId,Message,CreatedByUserId) VALUES(@ClaimId,@Message,@CurrentUserId); INSERT dbo.WebsiteWarrantyClaimHistory(WarrantyClaimId,EventType,Remark,ChangedByUserId) VALUES(@ClaimId,N'CustomerMessageAdded',N'Customer-safe message added.',@CurrentUserId); SELECT 201 StatusCode,N'Customer message added.' [Message]; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteWarrantyClaim_GetReport AS
BEGIN
 SET NOCOUNT ON;
 SELECT COUNT(*) TotalClaims,SUM(CASE WHEN Status=N'Submitted' THEN 1 ELSE 0 END) SubmittedClaims,SUM(CASE WHEN Status=N'UnderReview' THEN 1 ELSE 0 END) UnderReviewClaims,SUM(CASE WHEN Status=N'NeedMoreInformation' THEN 1 ELSE 0 END) NeedMoreInformationClaims,SUM(CASE WHEN Status=N'Approved' THEN 1 ELSE 0 END) ApprovedClaims,SUM(CASE WHEN Status=N'Rejected' THEN 1 ELSE 0 END) RejectedClaims,SUM(CASE WHEN Status=N'Completed' THEN 1 ELSE 0 END) CompletedClaims,SUM(CASE WHEN ResolutionType=N'Refund' THEN 1 ELSE 0 END) RefundCount,COALESCE(SUM(CASE WHEN ResolutionType=N'Refund' THEN RefundAmount ELSE 0 END),0) RefundAmountTotal,SUM(CASE WHEN ResolutionType=N'Replacement' THEN 1 ELSE 0 END) ReplacementCount,AVG(CASE WHEN ResolvedAtUtc IS NOT NULL THEN CONVERT(DECIMAL(18,2),DATEDIFF_BIG(SECOND,SubmittedAtUtc,ResolvedAtUtc))/3600 END) AverageResolutionHours,SUM(CASE WHEN Status IN(N'Submitted',N'UnderReview',N'NeedMoreInformation',N'Approved') AND SubmittedAtUtc>=DATEADD(DAY,-7,SYSUTCDATETIME()) THEN 1 ELSE 0 END) OpenUnder7Days,SUM(CASE WHEN Status IN(N'Submitted',N'UnderReview',N'NeedMoreInformation',N'Approved') AND SubmittedAtUtc<DATEADD(DAY,-7,SYSUTCDATETIME()) AND SubmittedAtUtc>=DATEADD(DAY,-30,SYSUTCDATETIME()) THEN 1 ELSE 0 END) Open7To30Days,SUM(CASE WHEN Status IN(N'Submitted',N'UnderReview',N'NeedMoreInformation',N'Approved') AND SubmittedAtUtc<DATEADD(DAY,-30,SYSUTCDATETIME()) THEN 1 ELSE 0 END) OpenOver30Days FROM dbo.WebsiteWarrantyClaims;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteManagementDashboard_GetOverview AS
BEGIN
 SET NOCOUNT ON; SELECT 200 StatusCode,N'Website management overview loaded.' [Message];
 SELECT (SELECT COUNT(*) FROM dbo.WebsiteProducts WHERE IsDeleted=0) TotalProducts,(SELECT COUNT(*) FROM dbo.WebsiteProducts WHERE IsDeleted=0 AND IsActive=1 AND PublishStatus=N'Published' AND PublishedAtUtc<=SYSUTCDATETIME()) PublishedProducts,(SELECT COUNT(*) FROM dbo.WebsiteBlogPosts WHERE IsDeleted=0) TotalBlogPosts,(SELECT COUNT(*) FROM dbo.WebsiteBlogPosts WHERE IsDeleted=0 AND PublishStatus=N'Published' AND PublishedAtUtc<=SYSUTCDATETIME()) PublishedBlogPosts,(SELECT COUNT(*) FROM dbo.WebsiteAnnouncements WHERE IsDeleted=0 AND IsActive=1 AND (StartsAtUtc IS NULL OR StartsAtUtc<=SYSUTCDATETIME()) AND (EndsAtUtc IS NULL OR EndsAtUtc>SYSUTCDATETIME())) ActiveAnnouncements,
        COUNT(*) TotalWarrantyClaims,COALESCE(SUM(CASE WHEN Status=N'Submitted' THEN 1 ELSE 0 END),0) SubmittedClaims,COALESCE(SUM(CASE WHEN Status=N'UnderReview' THEN 1 ELSE 0 END),0) UnderReviewClaims,COALESCE(SUM(CASE WHEN Status=N'Approved' THEN 1 ELSE 0 END),0) ApprovedClaims,COALESCE(SUM(CASE WHEN Status=N'Rejected' THEN 1 ELSE 0 END),0) RejectedClaims,COALESCE(SUM(CASE WHEN Status=N'Completed' THEN 1 ELSE 0 END),0) CompletedClaims,COALESCE(SUM(CASE WHEN ResolutionType=N'Refund' THEN 1 ELSE 0 END),0) RefundResolutions,COALESCE(SUM(CASE WHEN ResolutionType=N'Replacement' THEN 1 ELSE 0 END),0) ReplacementResolutions,COALESCE(SUM(CASE WHEN SubmittedAtUtc>=DATEFROMPARTS(YEAR(SYSUTCDATETIME()),MONTH(SYSUTCDATETIME()),1) THEN 1 ELSE 0 END),0) ClaimsThisMonth FROM dbo.WebsiteWarrantyClaims;
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteSettings_GetAll AS BEGIN SET NOCOUNT ON; SELECT SettingKey,Value,IsPublic,UpdatedAtUtc,UpdatedByUserId FROM dbo.WebsiteSettings ORDER BY SettingKey; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteSettings_GetPublic AS BEGIN SET NOCOUNT ON; SELECT SettingKey,Value,IsPublic,UpdatedAtUtc,UpdatedByUserId FROM dbo.WebsiteSettings WHERE IsPublic=1 ORDER BY SettingKey; END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteSettings_Update @SettingsJson NVARCHAR(MAX),@CurrentUserId INT AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF EXISTS(SELECT 1 FROM OPENJSON(@SettingsJson) WITH(SettingKey NVARCHAR(100) '$.SettingKey') WHERE SettingKey NOT IN(N'SupportEmail',N'ManufacturingLocation',N'SocialInstagramUrl',N'SocialFacebookUrl',N'SocialYoutubeUrl',N'SocialLinkedInUrl',N'WhatsAppNumber',N'WhatsAppDefaultMessage',N'DefaultSeoTitle',N'DefaultSeoDescription',N'DefaultSeoImage',N'PublicCountersEnabled',N'WarrantyStatisticsVisible')) BEGIN SELECT 400 StatusCode,N'One or more website setting keys are invalid.' [Message]; RETURN; END;
 MERGE dbo.WebsiteSettings target USING(SELECT SettingKey,Value,IsPublic FROM OPENJSON(@SettingsJson) WITH(SettingKey NVARCHAR(100) '$.SettingKey',Value NVARCHAR(2000) '$.Value',IsPublic BIT '$.IsPublic')) source ON target.SettingKey=source.SettingKey WHEN MATCHED THEN UPDATE SET Value=source.Value,IsPublic=source.IsPublic,UpdatedByUserId=@CurrentUserId,UpdatedAtUtc=SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT(SettingKey,Value,IsPublic,UpdatedByUserId,UpdatedAtUtc) VALUES(source.SettingKey,source.Value,source.IsPublic,@CurrentUserId,SYSUTCDATETIME()); SELECT 200 StatusCode,N'Website settings updated.' [Message];
END;
GO
CREATE OR ALTER PROCEDURE dbo.usp_WebsiteContactEnquiry_Create @FirstName NVARCHAR(100),@LastName NVARCHAR(100),@Email NVARCHAR(254),@Subject NVARCHAR(200),@Message NVARCHAR(4000),@EnquiryType NVARCHAR(50),@Source NVARCHAR(100) AS
BEGIN SET NOCOUNT ON; INSERT dbo.WebsiteContactEnquiries(FirstName,LastName,Email,Subject,Message,EnquiryType,Source) VALUES(@FirstName,@LastName,@Email,@Subject,@Message,@EnquiryType,@Source); SELECT 201 StatusCode,N'Contact enquiry submitted.' [Message]; END;
GO

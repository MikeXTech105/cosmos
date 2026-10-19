using Cosmos.Contracts.HsnGst;
using FluentValidation;
namespace Cosmos.Application.Validators;
public sealed class SaveHsnSacRequestValidator : AbstractValidator<SaveHsnSacRequest> { public SaveHsnSacRequestValidator(){ RuleFor(x=>x.Code).NotEmpty().MaximumLength(50).Matches("^[A-Za-z0-9]+$").WithMessage("Code may contain letters and digits only; official length policy is not enforced by Phase 1."); RuleFor(x=>x.CodeType).Must(x=>x is "HSN" or "SAC"); RuleFor(x=>x.Description).NotEmpty().MaximumLength(500); } }
public sealed class SaveGstRateRuleVersionRequestValidator : AbstractValidator<SaveGstRateRuleVersionRequest> { public SaveGstRateRuleVersionRequestValidator(){RuleFor(x=>x.RuleCode).NotEmpty().MaximumLength(100);RuleFor(x=>x.TotalRate).InclusiveBetween(0,100);RuleFor(x=>x.EffectiveTo).GreaterThanOrEqualTo(x=>x.EffectiveFrom).When(x=>x.EffectiveTo.HasValue);RuleFor(x=>x.Notes).MaximumLength(1000);} }
public sealed class RetireHsnMappingRequestValidator : AbstractValidator<RetireHsnMappingRequest> { public RetireHsnMappingRequestValidator(){ RuleFor(x=>x.EffectiveTo).NotEmpty(); } }

using Cosmos.Contracts.Manufacturing;
using FluentValidation;
namespace Cosmos.Application.Validators;
public sealed class CreateManufacturingBomValidator : AbstractValidator<CreateManufacturingBomRequest>
{
 public CreateManufacturingBomValidator(){RuleFor(x=>x.FinishedItemId).GreaterThan(0);RuleFor(x=>x.Version).NotEmpty().MaximumLength(30);RuleFor(x=>x.Components).NotEmpty();RuleForEach(x=>x.Components).ChildRules(x=>{x.RuleFor(y=>y.ComponentItemId).GreaterThan(0);x.RuleFor(y=>y.Quantity).GreaterThan(0);x.RuleFor(y=>y.WastagePercentage).InclusiveBetween(0,100);});RuleFor(x=>x.Components).Must(x=>x.Select(y=>y.ComponentItemId).Distinct().Count()==x.Count).WithMessage("Duplicate BOM components are not allowed.");}
}
public sealed class CreateManufacturingProductionValidator : AbstractValidator<CreateManufacturingProductionRequest>
{
 public CreateManufacturingProductionValidator(){RuleFor(x=>x.FinishedItemId).GreaterThan(0);RuleFor(x=>x.PlannedQuantity).GreaterThanOrEqualTo(0);RuleFor(x=>x.ProducedQuantity).GreaterThan(0);}
}

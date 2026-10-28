using System.Text.Json;
using Cosmos.Application.Abstractions.Persistence;
using Cosmos.Application.Parties.Commands;
using Cosmos.Application.Services;
using Cosmos.Application.Validators;
using Cosmos.Contracts.Parties;
using Moq;

namespace Cosmos.Tests.Parties;

public sealed class PartyTypeUpdateTests
{
    private static readonly JsonSerializerOptions Options=new(){PropertyNameCaseInsensitive=true};
    [Theory]
    [InlineData("Customer",null,"Customer")]
    [InlineData("Supplier",null,"Supplier")]
    [InlineData("Both",null,"Both")]
    [InlineData("Customer","Supplier","Supplier")]
    public async Task Legacy_omission_preserves_persisted_role_and_explicit_edits_are_applied(string stored,string? requested,string expected)
    {
        var id=Guid.NewGuid();
        var old=JsonSerializer.Deserialize<PartyDto>("""{"partyCode":"P1","partyName":"Party","partyType":"Both","rowVersion":""}""",Options)! with{Id=id,PartyType=stored};
        var command=JsonSerializer.Deserialize<UpdatePartyCommand>("""{"partyCode":"P1","partyName":"Party","isActive":true}""",Options)!;
        Assert.Null(command.PartyType);
        command=command with{PartyType=requested};
        var repository=new Mock<IPartyRepository>();
        repository.Setup(x=>x.GetByIdAsync(id,It.IsAny<CancellationToken>())).ReturnsAsync(old);
        repository.Setup(x=>x.UpdateAsync(id,It.IsAny<UpdatePartyCommand>(),It.IsAny<CancellationToken>())).ReturnsAsync(old with{PartyType=expected});
        var service=new PartyService(repository.Object,Mock.Of<IAuditRepository>(),new CreatePartyValidator(),new UpdatePartyValidator(),new GetPartiesQueryValidator(),new ChangePartyStatusValidator());
        await service.UpdateAsync(id,command,default);
        repository.Verify(x=>x.UpdateAsync(id,It.Is<UpdatePartyCommand>(value=>value.PartyType==expected),It.IsAny<CancellationToken>()),Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("Unexpected")]
    public void Explicit_invalid_roles_are_rejected_instead_of_being_defaulted(string role)
    {
        var command=JsonSerializer.Deserialize<UpdatePartyCommand>("""{"partyCode":"P1","partyName":"Party"}""",Options)! with{PartyType=role};
        Assert.False(new UpdatePartyValidator().Validate(command).IsValid);
    }
}

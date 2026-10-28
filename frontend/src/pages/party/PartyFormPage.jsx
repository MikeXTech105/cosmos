import useFormReturnContext from "../../hooks/useFormReturnContext";
import { Contact } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import PageHeader from "../../components/common/PageHeader";
import useCapabilities from "../../hooks/useCapabilities";
import { getApiStatus } from "../../utils/apiError";
import { withoutDirtyPrompt } from "../../utils/dirtyWork";
import { PARTY_COMMAND_FIELDS, PARTY_FIELD_SECTIONS } from "./partyColumns";
import { extractEntity, getErrorMessage } from "./partyHelpers";
import { PartyFormContent } from "./PartyFormModal";
import { partyService } from "./partyService";

const PartyFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { returnToList } = useFormReturnContext("/party");
  const capabilities = useCapabilities({
    actions: ["view", "create", "update"],
    label: "Party Master",
    pageName: "Party",
    resource: "party",
    route: "/party",
  });

  const [state, setState] = useState({ error: null, loading: isEdit, party: null });

  useEffect(() => {
    if (!isEdit) {
      return undefined;
    }

    const controller = new AbortController();

    void Promise.resolve().then(() => {
      if (controller.signal.aborted) {
        return undefined;
      }

      setState({ error: null, loading: true, party: null });

      return partyService
        .getPartyById(id, { signal: controller.signal })
        .then((response) => {
          if (controller.signal.aborted) return;
          setState({ error: null, loading: false, party: extractEntity(response.data) });
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          if (getApiStatus(error) === 404) {
            toast.error("This party no longer exists.");
            withoutDirtyPrompt(() => returnToList());
            return;
          }

          setState({ error: getErrorMessage(error, "Unable to load party details."), loading: false, party: null });
        });
    });

    return () => controller.abort();
  }, [id, isEdit, returnToList]);

  const saveDisabledReason = (isEdit ? capabilities.canUpdate : capabilities.canCreate)
    ? ""
    : `You need ${isEdit ? "edit" : "create"} permission for parties.`;

  const submitParty = async (payload) => {
    if (saveDisabledReason) {
      toast.error(saveDisabledReason);
      throw new Error(saveDisabledReason);
    }

    try {
      let response;
      if (isEdit) {
        response=await partyService.updateParty(id, payload);
        toast.success("Party updated successfully");
      } else {
        response=await partyService.createParty(payload);
        toast.success("Party created successfully");
      }

      withoutDirtyPrompt(() => returnToList(extractEntity(response.data)?.id ?? (isEdit ? id : undefined)));
    } catch (error) {
      if (isEdit && getApiStatus(error) === 404) {
        toast.error("This party no longer exists.");
        throw error;
      }

      toast.error(getErrorMessage(error, "Unable to save this party."));
      throw error;
    }
  };

  const title = isEdit ? "Edit party" : "Add party";
  const formSource = isEdit && String(state.party?.id) === String(id) ? state.party : null;
  const formLoading = isEdit && (state.loading || !formSource);

  if (isEdit && state.error) {
    return (
      <div className="space-y-5">
        <PageHeader badge={<><Contact className="h-3.5 w-3.5" /> Party Master</>} title={title} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{state.error}</div>
      </div>
    );
  }

  return (
    <section className="flex min-h-[calc(100dvh-8rem)] min-w-0 flex-col space-y-5">
      <PageHeader
        badge={<><Contact className="h-3.5 w-3.5" /> Party Master</>}
        title={title}
        description={
          isEdit
            ? "Update every Party detail in one place."
            : "Verify GSTIN to auto-fill details, then review and create the Party."
        }
      />

      {formLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="-mx-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mx-0">
          <PartyFormContent
            key={id ?? "new"}
            fields={PARTY_COMMAND_FIELDS}
            groupedFields={PARTY_FIELD_SECTIONS.map((section) => ({
              ...section,
              fields: PARTY_COMMAND_FIELDS.filter((field) => field.section === section.id),
            })).filter((section) => section.fields.length > 0)}
            isView={false}
            mode={isEdit ? "edit" : "create"}
            source={formSource}
            submitLabel={isEdit ? "Save Changes" : "Create Party"}
            onClose={() => returnToList()}
            onSubmit={submitParty}
          />
        </div>
      )}
    </section>
  );
};

export default PartyFormPage;

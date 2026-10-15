import MinerboFuchsModel, { MinerboFuchsPreview } from "./minerbo-fuchs";
import BlueprintModel, { BlueprintPreview } from "./1500-blueprint";
import CanesModel, { CanesPreview } from "./canes-pressure-washing";
import WoofGangModel, { WoofGangPreview } from "./woof-gang";
import SkormanModel, { SkormanPreview } from "./skorman";
import SafastModel, { SafastPreview } from "./safast-logistics";

export function CaseModel({ slug }: { slug: string }) {
  switch (slug) {
    case "minerbo-fuchs": return <MinerboFuchsModel />;
    case "1500-blueprint": return <BlueprintModel />;
    case "canes-pressure-washing": return <CanesModel />;
    case "woof-gang": return <WoofGangModel />;
    case "skorman": return <SkormanModel />;
    case "safast-logistics": return <SafastModel />;
    default: return null;
  }
}

// Static drawings for the index cards. No WebGL on the index.
export function CasePreview({ slug }: { slug: string }) {
  switch (slug) {
    case "minerbo-fuchs": return <MinerboFuchsPreview />;
    case "1500-blueprint": return <BlueprintPreview />;
    case "canes-pressure-washing": return <CanesPreview />;
    case "woof-gang": return <WoofGangPreview />;
    case "skorman": return <SkormanPreview />;
    case "safast-logistics": return <SafastPreview />;
    default: return null;
  }
}

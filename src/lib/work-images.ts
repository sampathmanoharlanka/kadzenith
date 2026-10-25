import harvesting from "@/assets/work-harvesting.jpg";
import mulching from "@/assets/work-mulching.jpg";
import sowing from "@/assets/work-sowing.jpg";
import spraying from "@/assets/work-spraying.jpg";
import transplanting from "@/assets/work-transplanting.jpg";
import weeding from "@/assets/work-weeding.jpg";

const WORK_IMAGES: Record<string, string> = {
  sowing,
  weeding,
  transplanting,
  spraying,
  mulching,
  harvesting,
};

export function workImage(workTypeId: string) {
  return WORK_IMAGES[workTypeId] ?? sowing;
}

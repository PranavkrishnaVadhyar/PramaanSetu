export type RiskBand = "low" | "medium" | "high";

export function getRiskBand(score: number): {
  band: RiskBand;
  label: string;
  colorVar: string;
  bgVar: string;
  icon: "check-circle" | "alert-triangle" | "alert-octagon";
} {
  if (score <= 30) {
    return {
      band: "low",
      label: "Low risk",
      colorVar: "--color-risk-low",
      bgVar: "--color-risk-low-bg",
      icon: "check-circle",
    };
  }
  if (score <= 65) {
    return {
      band: "medium",
      label: "Medium risk",
      colorVar: "--color-risk-medium",
      bgVar: "--color-risk-medium-bg",
      icon: "alert-triangle",
    };
  }
  return {
    band: "high",
    label: "High risk",
    colorVar: "--color-risk-high",
    bgVar: "--color-risk-high-bg",
    icon: "alert-octagon",
  };
}

import { useTheme } from "../context/ThemeContext";
import "./StyleToggle.css";

const STYLE_LABELS = {
  standard: "Standard",
  neumorphic: "Neumorphic",
  glassy: "Glassy",
};

export default function StyleToggle() {
  const { cycleStyle, nextStyle } = useTheme();

  return (
    <button className="style-toggle" onClick={cycleStyle} title="Switch style">
      {STYLE_LABELS[nextStyle]}
    </button>
  );
}

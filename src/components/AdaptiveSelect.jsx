import { useIsMobile } from "@/hooks/use-mobile";
import SearchableSelect from "@/components/SearchableSelect";
import MobileSelect from "@/components/MobileSelect";

/**
 * AdaptiveSelect — renderiza MobileSelect en mobile y SearchableSelect en desktop.
 * Misma API que SearchableSelect: { label, required, value, onChange, options, placeholder }
 */
export default function AdaptiveSelect(props) {
  const isMobile = useIsMobile();
  const Component = isMobile ? MobileSelect : SearchableSelect;
  return <Component {...props} />;
}
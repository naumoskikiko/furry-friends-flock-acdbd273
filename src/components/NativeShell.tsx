import { useNativeBackButton } from "@/hooks/useNativeBackButton";

/**
 * Mounts native shell behaviors (Android back button, etc.).
 * Must live INSIDE <BrowserRouter> because it uses react-router hooks.
 * Renders nothing.
 */
const NativeShell = () => {
  useNativeBackButton();
  return null;
};

export default NativeShell;

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Modal } from "./ui.jsx";

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export default function InstallButton() {
  const [evt, setEvt] = useState(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(standalone());

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const click = async () => {
    if (evt) { evt.prompt(); await evt.userChoice; setEvt(null); }
    else setHelp(true);
  };

  return (
    <>
      <button onClick={click} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-emerald-300 hover:bg-slate-800">
        <Download size={16} /> Install app
      </button>
      {help && (
        <Modal title="Install Sova" onClose={() => setHelp(false)}>
          {isIos() ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Open this site in <b>Safari</b>.</li>
              <li>Tap the <b>Share</b> button (the square with an arrow).</li>
              <li>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Open the browser menu (the three dots).</li>
              <li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li>
              <li>Confirm, and Sova appears with your other apps.</li>
            </ol>
          )}
        </Modal>
      )}
    </>
  );
}

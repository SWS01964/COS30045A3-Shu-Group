"""Run a KNIME workflow folder headless and report success.

    python processing/knime/run_headless.py knime/BeyondTheRoadToll [--save] [--timeout 300]

Why this exists: KNIME 5.5.1 executes the workflow in a few seconds but the process then never exits (a Chromium
helper keeps it alive). So we start it in the background, poll the log for "Workflow execution done", then kill KNIME
and its helper processes. Exit code 0 only if the log shows no "did not execute sucessfully" (sic) line.
By default the run uses -nosave (the workflow folder is left as built); --save keeps the executed state.
"""
import argparse, os, shutil, signal, subprocess, sys, tempfile, time
from pathlib import Path

KNIME = "/Applications/KNIME 5.5.1.app/Contents/MacOS/knime"
NOISE = ("KnimeBrowserView", "Could not save application state", "JRSAppKitAWT")
DONE = "Workflow execution done"
FAIL = "did not execute sucessfully"


def kill_tree(proc):
    """Kill KNIME and every child (Chromium helpers). Only our own process group, never a user's open KNIME."""
    try:
        os.killpg(proc.pid, signal.SIGKILL)
    except Exception:
        pass
    try:
        kids = subprocess.run(["pgrep", "-P", str(proc.pid)], capture_output=True, text=True).stdout.split()
        for pid in kids:
            subprocess.run(["kill", "-9", pid], capture_output=True)
    except Exception:
        pass
    try:
        proc.kill()
        proc.wait(timeout=10)
    except Exception:
        pass


def run(workflow, timeout=300, save=False):
    workflow = Path(workflow).resolve()
    ws = Path(tempfile.mkdtemp(prefix="knime_ws_"))
    log = ws / "run.log"
    cmd = [KNIME, "-nosplash", "-consoleLog", "-application", "org.knime.product.KNIME_BATCH_APPLICATION",
           "-data", str(ws), f"-workflowDir={workflow}", "-reset"]
    if not save:
        cmd.append("-nosave")
    ok, finished = False, False
    with open(log, "w") as lf:
        proc = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT, start_new_session=True)
        t0 = time.time()
        try:
            while time.time() - t0 < timeout:
                time.sleep(1)
                txt = log.read_text(errors="replace")
                if DONE in txt:
                    finished = True
                    time.sleep(2)  # let the final lines flush
                    break
                if proc.poll() is not None:
                    break
        finally:
            kill_tree(proc)
    txt = log.read_text(errors="replace")
    ok = finished and FAIL not in txt
    for line in txt.splitlines():
        if (" ERROR " in line or " WARN " in line or line.startswith(("ERROR", "WARN"))) and not any(n in line for n in NOISE):
            print(line)
    if not finished:
        print(f"TIMEOUT or KNIME exited before '{DONE}' (log: {log})")
    elif FAIL in txt:
        print(f"Workflow did NOT execute successfully (log: {log})")
    else:
        print(f"Workflow executed OK ({[l for l in txt.splitlines() if DONE in l][0].split('BatchExecutor')[-1].strip()})")
    if ok:
        shutil.rmtree(ws, ignore_errors=True)
    return 0 if ok else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("workflow")
    ap.add_argument("--timeout", type=int, default=300)
    ap.add_argument("--save", action="store_true")
    a = ap.parse_args()
    code = run(a.workflow, a.timeout, a.save)
    sys.exit(code)

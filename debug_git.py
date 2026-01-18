import subprocess
import os

cwd = "/Users/hermes/Downloads/RESTONEXT MX"

def run_git(args):
    try:
        result = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True)
        return (f"CMD: git {' '.join(args)}\n"
                f"RC: {result.returncode}\n"
                f"STDOUT:\n{result.stdout}\n"
                f"STDERR:\n{result.stderr}\n"
                f"{'-'*20}\n")
    except Exception as e:
        return f"CMD: git {' '.join(args)}\nEXCEPTION: {e}\n{'-'*20}\n"

output = ""
output += run_git(["status"])
output += run_git(["branch", "-vv"])
output += run_git(["log", "-n", "5", "--oneline"])
# output += run_git(["push", "origin", "main", "--dry-run"]) # Dry run first

with open("git_debug.log", "w") as f:
    f.write(output)

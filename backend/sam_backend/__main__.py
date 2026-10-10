"""Launch the local SAM API bound to loopback only."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("sam_backend.main:app", host="127.0.0.1", port=8000, reload=False)

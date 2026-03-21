import hashlib
import time
import asyncio
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# Module-level — instantiated once, reused across all calls
_simulator = AerSimulator()

def _run_circuit() -> str:
    """Blocking circuit execution — runs in thread executor."""
    qc = QuantumCircuit(4, 4)
    qc.h(range(4))
    qc.measure(range(4), range(4))
    job = _simulator.run(qc, shots=1)
    result = job.result()
    counts = result.get_counts()
    return list(counts.keys())[0]

async def _generate_raw_token() -> str:
    """Generates one quantum-seeded token candidate."""
    loop = asyncio.get_event_loop()
    quantum_state = await loop.run_in_executor(None, _run_circuit)
    salted_entropy = quantum_state + str(time.time())
    hashed_token = hashlib.sha256(salted_entropy.encode()).hexdigest()
    return f"Q-{hashed_token[:12].upper()}"

async def generate_quantum_token(redis_client) -> str:
    """
    Returns a guaranteed-unique quantum-seeded patient token.
    Verifies against Redis before returning.
    """
    for _ in range(5):
        token = await _generate_raw_token()
        exists = await redis_client.exists(f"patient:{token}")
        if not exists:
            return token
    raise RuntimeError("CRITICAL: Token generation failed — Redis unreachable or collision loop.")
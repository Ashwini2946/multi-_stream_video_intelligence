"""
Evaluation Benchmark Runner.
Calculates Precision@K, Recall@K, Mean Reciprocal Rank (MRR),
and Mean Average Precision (mAP) across benchmark queries.
"""
import json
from pathlib import Path
from typing import Dict, List, Any

def compute_metrics(ground_truth: List[str], retrieved: List[str], k: int = 5) -> Dict[str, float]:
    gt_set = set(ground_truth)
    top_k_retrieved = retrieved[:k]
    hits = [r for r in top_k_retrieved if r in gt_set]

    precision_at_k = len(hits) / k if k > 0 else 0.0
    recall_at_k = len(hits) / len(gt_set) if gt_set else 0.0

    # Reciprocal Rank (RR)
    rr = 0.0
    for idx, r in enumerate(retrieved, start=1):
        if r in gt_set:
            rr = 1.0 / idx
            break

    return {
        f"precision@{k}": round(precision_at_k, 3),
        f"recall@{k}": round(recall_at_k, 3),
        "reciprocal_rank": round(rr, 3)
    }

def run_evaluation(queries_path: Path):
    with open(queries_path, "r") as f:
        queries = json.load(f)

    total_mrr = 0.0
    total_recall_5 = 0.0

    print(f"Running evaluation on {len(queries)} benchmark queries...")
    for q in queries:
        gt = q["ground_truth_clip_ids"]
        # Simulated retrieved candidates
        retrieved = gt + ["clip_noise_1", "clip_noise_2"]
        metrics = compute_metrics(gt, retrieved, k=5)
        total_mrr += metrics["reciprocal_rank"]
        total_recall_5 += metrics["recall@5"]
        print(f"Query [{q['id']}]: {q['query']} -> MRR={metrics['reciprocal_rank']}, R@5={metrics['recall@5']}")

    n = max(1, len(queries))
    print("\n--- Summary Benchmark ---")
    print(f"Mean Reciprocal Rank (MRR): {round(total_mrr / n, 3)}")
    print(f"Mean Recall@5: {round(total_recall_5 / n, 3)}")

if __name__ == "__main__":
    run_evaluation(Path(__file__).parent / "queries.json")

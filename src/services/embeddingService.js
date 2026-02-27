let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log('Loading embedding model (first time only)...');
    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model loaded');
  }
  return embedder;
}

class EmbeddingService {

  static async generateEmbedding(text) {
    try {
      const extractor = await getEmbedder();
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (err) {
      console.error('Embedding generation failed:', err.message);
      return [];
    }
  }

  static cosineSimilarity(vecA, vecB) {
    if (!vecA.length || !vecB.length) return 0;

    const dot  = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magA === 0 || magB === 0) return 0;

    return dot / (magA * magB);
  }

  static rankCandidates(jobEmbedding, candidates) {
    return candidates
      .map(candidate => {
        const score = EmbeddingService.cosineSimilarity(
          jobEmbedding,
          candidate.embedding || []
        );
        return { ...candidate, similarityScore: parseFloat(score.toFixed(4)) };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore);
  }
}

module.exports = EmbeddingService;
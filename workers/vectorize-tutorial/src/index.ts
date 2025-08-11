export interface Env {
	// This makes your vector index methods available on env.VECTORIZE.*
	// For example, env.VECTORIZE.insert() or query()
	VECTORIZE: Vectorize;
  }
  
  // Sample vectors: 32 dimensions wide.
  //
  // Vectors from popular machine-learning models are typically ~100 to 1536 dimensions
  // wide (or wider still).
  const sampleVectors: Array<VectorizeVector> = [
	{
	  id: "1",
	  values: [
		0.12, 0.45, 0.67, 0.89, 0.23, 0.56, 0.34, 0.78, 0.12, 0.9, 0.24, 0.67,
		0.89, 0.35, 0.48, 0.7, 0.22, 0.58, 0.74, 0.33, 0.88, 0.66, 0.45, 0.27,
		0.81, 0.54, 0.39, 0.76, 0.41, 0.29, 0.83, 0.55,
	  ],
	  metadata: { url: "/products/sku/13913913" },
	},
	{
	  id: "2",
	  values: [
		0.14, 0.23, 0.36, 0.51, 0.62, 0.47, 0.59, 0.74, 0.33, 0.89, 0.41, 0.53,
		0.68, 0.29, 0.77, 0.45, 0.24, 0.66, 0.71, 0.34, 0.86, 0.57, 0.62, 0.48,
		0.78, 0.52, 0.37, 0.61, 0.69, 0.28, 0.8, 0.53,
	  ],
	  metadata: { url: "/products/sku/10148191" },
	},
	{
	  id: "3",
	  values: [
		0.21, 0.33, 0.55, 0.67, 0.8, 0.22, 0.47, 0.63, 0.31, 0.74, 0.35, 0.53,
		0.68, 0.45, 0.55, 0.7, 0.28, 0.64, 0.71, 0.3, 0.77, 0.6, 0.43, 0.39, 0.85,
		0.55, 0.31, 0.69, 0.52, 0.29, 0.72, 0.48,
	  ],
	  metadata: { url: "/products/sku/97913813" },
	},
	{
	  id: "4",
	  values: [
		0.17, 0.29, 0.42, 0.57, 0.64, 0.38, 0.51, 0.72, 0.22, 0.85, 0.39, 0.66,
		0.74, 0.32, 0.53, 0.48, 0.21, 0.69, 0.77, 0.34, 0.8, 0.55, 0.41, 0.29,
		0.7, 0.62, 0.35, 0.68, 0.53, 0.3, 0.79, 0.49,
	  ],
	  metadata: { url: "/products/sku/418313" },
	},
	{
	  id: "5",
	  values: [
		0.11, 0.46, 0.68, 0.82, 0.27, 0.57, 0.39, 0.75, 0.16, 0.92, 0.28, 0.61,
		0.85, 0.4, 0.49, 0.67, 0.19, 0.58, 0.76, 0.37, 0.83, 0.64, 0.53, 0.3,
		0.77, 0.54, 0.43, 0.71, 0.36, 0.26, 0.8, 0.53,
	  ],
	  metadata: { url: "/products/sku/55519183" },
	},
  ];
  
  export default {
	async fetch(request, env, ctx): Promise<Response> {
	  let path = new URL(request.url).pathname;
	  if (path.startsWith("/favicon")) {
		return new Response("", { status: 404 });
	  }
  
	  // You only need to insert vectors into your index once
	  if (path.startsWith("/insert")) {
		// Insert some sample vectors into your index
		// In a real application, these vectors would be the output of a machine learning (ML) model,
		// such as Workers AI, OpenAI, or Cohere.
		let inserted = await env.VECTORIZE.insert(sampleVectors);
  
		// Return the mutation identifier for this insert operation
		return Response.json(inserted);
	  }
  
	  // return Response.json({text: "nothing to do... yet"}, { status: 404 })
  
	  // In a real application, you would take a user query. For example, "what is a
	  // vector database" - and transform it into a vector embedding first.
	  //
	  // In this example, you will construct a vector that should
	  // match vector id #4
	  const queryVector: Array<number> = [
		0.13, 0.25, 0.44, 0.53, 0.62, 0.41, 0.59, 0.68, 0.29, 0.82, 0.37, 0.5,
		0.74, 0.46, 0.57, 0.64, 0.28, 0.61, 0.73, 0.35, 0.78, 0.58, 0.42, 0.32,
		0.77, 0.65, 0.49, 0.54, 0.31, 0.29, 0.71, 0.57,
	  ]; // vector of dimensions 32
  
	  // Query your index and return the three (topK = 3) most similar vector
	  // IDs with their similarity score.
	  //
	  // By default, vector values are not returned, as in many cases the
	  // vector id and scores are sufficient to map the vector back to the
	  // original content it represents.
	  const matches = await env.VECTORIZE.query(queryVector, {
		topK: 3,
		returnValues: true,
		returnMetadata: "all",
	  });
  
	  return Response.json({
		// This will return the closest vectors: the vectors are arranged according
		// to their scores. Vectors that are more similar would show up near the top.
		// In this example, Vector id #4 would turn out to be the most similar to the queried vector.
		// You return the full set of matches so you can check the possible scores.
		matches: matches,
	  });
	},
  } satisfies ExportedHandler<Env>;
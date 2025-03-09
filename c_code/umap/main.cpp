#include "umappp/umappp.hpp"
#include <vector>
#include <emscripten/bind.h>

// Function to run UMAP and return the embedding
std::vector<std::vector<double>> runUmap(const std::vector<std::vector<double>>& input) {
    // Get dimensions from input
    size_t nobs = input.size();
    size_t ndim = input[0].size();
    
    // Flatten the input data
    std::vector<double> data;
    for (const auto& row : input) {
        data.insert(data.end(), row.begin(), row.end());
    }
    
    // Set output dimensions (2D embedding)
    size_t out_dim = 2;
    std::vector<double> embedding(nobs * out_dim);
    
    // Initialize UMAP
    umappp::Options opt;
    auto status = umappp::initialize(
        ndim,
        nobs,
        data.data(),
        knncolle::VptreeBuilder(), // algorithm to find neighbors
        out_dim,
        embedding.data(),
        opt
    );
    
    // Run UMAP algorithm
    status.run();
    
    // Convert the flat embedding back to 2D vector
    std::vector<std::vector<double>> result(nobs, std::vector<double>(out_dim));
    for (size_t i = 0; i < nobs; ++i) {
        for (size_t j = 0; j < out_dim; ++j) {
            result[i][j] = embedding[i * out_dim + j];
        }
    }
    
    return result;
}

// Binding code for JavaScript
EMSCRIPTEN_BINDINGS(umap_module) {
    emscripten::register_vector<double>("VectorDouble");
    emscripten::register_vector<std::vector<double>>("VectorVectorDouble");
    
    emscripten::function("runUmap", &runUmap);
}

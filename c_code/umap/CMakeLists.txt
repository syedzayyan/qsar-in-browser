cmake_minimum_required(VERSION 3.14)
project(UmapWasm)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include FetchContent for downloading umappp
include(FetchContent)
FetchContent_Declare(
  umappp 
  GIT_REPOSITORY https://github.com/libscran/umappp
  GIT_TAG master
)
FetchContent_MakeAvailable(umappp)

# Create the WebAssembly target
add_executable(umap_wasm main.cpp)
target_link_libraries(umap_wasm PRIVATE umappp)

# Emscripten-specific settings
set_target_properties(umap_wasm PROPERTIES
    SUFFIX ".js"
    LINK_FLAGS "-s EXPORT_NAME='UmapModule' -s MODULARIZE=1 -s EXPORT_ES6=1 -s USE_ES6_IMPORT_META=0 -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s WASM=1 -O3"
)

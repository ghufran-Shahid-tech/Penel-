cmake_minimum_required(VERSION 3.22.1)
project("goldfire_test_engine" LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(
    goldfire_test_engine
    SHARED
    goldfire_test_engine.cpp
    jni_bridge.cpp
)

find_library(
    log-lib
    log
)

target_link_libraries(
    goldfire_test_engine
    ${log-lib}
)

// Package http implements the HTTP API layer.
//
// Handlers must remain thin: parse input, validate it, call the application
// layer, and map the result to an HTTP response. They must not read files or
// implement domain rules directly.
package http

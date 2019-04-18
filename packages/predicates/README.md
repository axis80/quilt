# `@shopify/predicates`

[![Build Status](https://travis-ci.org/Shopify/quilt.svg?branch=master)](https://travis-ci.org/Shopify/quilt)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md) [![npm version](https://badge.fury.io/js/%40shopify%2Fpredicates.svg)](https://badge.fury.io/js/%40shopify%2Fpredicates.svg)

A set of common predicates for JS/TS apps. Most of the functions in this library either take one input and return `true` / `false`, or return a customized function that does so.

## Installation

```bash
$ yarn add @shopify/predicates
```

## API

### Predicates

- `isPositiveNumericString` Returns `true` when its input is a positive numeric string and `false` otherwise.
- `isNumericString` Returns `true` when its input is a numeric string and `false` otherwise.
- `isEmpty` Returns `true` when its input is `null`, `undefined`, or has `length` 0.
- `isEmptyString` Returns `true` when it's input is an empty string or contains only whitespace.
- `notEmpty` Returns `true` when its input is not `null`, `undefined` or has `length` 0.

### Predicate creators

- `lengthMoreThan` Returns a function which returns `true` when it's input has length more than the given number and `false` otherwise.
- `lengthLessThan` Returns a function which returns `true` when it's input has length less than the given number and `false` otherwise.

### Helpers

- `not` Given a function that returns a boolean, returns a function that returns a boolean in the opposite cases.

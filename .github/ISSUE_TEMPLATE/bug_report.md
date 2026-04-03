---
name: Bug Report
description: Report a bug or unexpected behavior
labels: ["kind:bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug! Please fill out the details below.

  - type: textarea
    id: description
    attributes:
      label: Description
      description: What happened?
      placeholder: Describe the bug...
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: How can we reproduce this?
      placeholder: |
        1. Step one...
        2. Step two...
        3. ...
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What did you expect to happen?
      placeholder: Describe expected outcome...
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened?
      placeholder: Describe actual outcome...
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: What environment were you running in?
      placeholder: |
        - OS:
        - Node version:
        - Package version:
    validations:
      required: false

  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Any other relevant information?
      placeholder: Logs, screenshots, etc.
    validations:
      required: false
---

---
name: Feature Request
description: Request a new feature or enhancement
labels: ["kind:feature"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature! Please fill out the details below.

  - type: textarea
    id: summary
    attributes:
      label: Summary
      description: What feature are you requesting?
      placeholder: Briefly describe the feature...
    validations:
      required: true

  - type: textarea
    id: motivation
    attributes:
      label: Motivation
      description: Why is this feature needed? What problem does it solve?
      placeholder: Explain the use case...
    validations:
      required: true

  - type: textarea
    id: proposal
    attributes:
      label: Proposal
      description: How should this feature work?
      placeholder: Describe the proposed solution...
    validations:
      required: false

  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Any other relevant information?
      placeholder: Links, screenshots, etc.
    validations:
      required: false
---

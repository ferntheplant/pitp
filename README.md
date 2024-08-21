# Open source, self-hosted Partiful alternative

## Guiding Principles

- one click self-hosted deploy
- usable by non-developers
  - just customize a single HTML/CSS file
  - maybe even just set some words in a config file and use a default template
- compatible with free tier hosting on places like Render
  - holy grail is GitHub actions deploy on free GitHub Pages domain
  - secure by default to prevent chumps from publicly deploying secret keys, etc.
- "transparent" enough for devs to mess around and add more features for their parties

## Core Features

- password protected party pages
- notification system for party reminders/updates
  - set up automated reminder system on deploy
- RSVP list viewable by all who RSVP
  - configurable public count displayed to non-RSVP'd password authorized viewers
- default HTML templates to choose an aesthetic from
- strong documentation on the minimum required stuff in the HTML template
  - password entry page
  - rsvp form actions
  - default CSS classes for elements like the RSVP list and party details

## Stretch Goals

- email verification on attendees to prevent abuse
  - enables attendee login for RSVP status updates
  - enables "forum" for party discussion among attendees

## Resources

- Mail sender
  - [SendGrid](https://sendgrid.com/en-us/pricing)
  - [Mailjet](https://www.mailjet.com/pricing/)
  - [Aha send](https://ahasend.com/pricing)
  - [Postmark](https://postmarkapp.com/pricing)
- Hosting
  - [Vercel](https://vercel.com/pricing)
  - [Render](https://render.com/pricing)
  - [Netlify](https://www.netlify.com/pricing/#pricing-table)

# Party in the Party 👃

Open source, self-hosted Partiful alternative

TODO: rename this to "party at the party" lol

## Guiding Principles

- one click self-hosted deploy
- usable by non-developers
  - just customize a single HTML/CSS file
  - maybe even just set some words in a config file and use a default template/style
- compatible with free tier hosting on places like Render
  - holy grail is GitHub actions deploy on free GitHub Pages domain
  - secure by default to prevent noobs from publicly deploying secret keys, etc.
- "transparent" enough for devs to mess around and add more features for their parties

## Core Features

- password protected party pages
- RSVP list for attendees
  - admin protected RSVP contact info available to host
- default HTML templates to populate party details
- strong documentation on the minimum required stuff in the HTML template
  - password entry page
  - party details view
  - rsvp form
  - rsvp list
  - default CSS classes for elements like the RSVP list and party details

### Product Flow

#### Simple Flow without Transaction Email

1. `host` forks PITP GitHub repo to (possibly private) repository
2. (optional) `host` edits `style.css` to customize the look of their party page(s)
3. `host` clicks "Deploy to < hosting service >"
    - will use providers simple sign up and login system
    - (optional) `host` sets up custom domain with hosting service
4. `host` shares party site URL and password with `guests` through personal communications channels
5. `guest` visits party site and is greeted with "Enter Password" view
6. `guest` enters correct party password and is shown "Party Home" page
    - `guest` can see all party details
    - `guest` can see the number of attendees
    - `guest` can click to navigate to "RSVP Form"
7. `guest` submits "RSVP" form
    - `guest` provides name, email, and status of "GOING", "MAYBE", "NOT GOING"
8. `host` visits party site URL sub-page for "admin"
9. `host` enters correct admin password and is shown "Party Admin" page
    - `host` is shown list of all RSVPs
    - `host` is given easy mechanism to copy-paste emails for sending reminders/updates
10. `host` makes update to party details by editing config file or HTML template
    - `host` commits and pushes changes to GitHub
    - party site automatically updates while maintaining existing list of RSVPs

#### Adding Transactional Email

- In step 2 `host` also defines notification schedule
- In step 3 `host` will need to set up account with mail provider and insert relevant API keys into config
- QUESTION: should there be a page for using same transaction email system for party updates?
  - This use case could be handled by the manual email list system

## Stretch Goals

- notification system for party reminders/updates
  - set up automated reminder system on deploy
- email/SMS verification on attendees to prevent abuse
  - enables attendee login for RSVP status updates
  - enables "forum" for party discussion among attendees
- multiple password options for meme passwords
- more admin controls like manual editing of RSVP list

## Resources

- Mail sender
  - [SendGrid](https://sendgrid.com/en-us/pricing)
  - [Mailjet](https://www.mailjet.com/pricing/)
  - [Aha send](https://ahasend.com/pricing)
  - [Postmark](https://postmarkapp.com/pricing)

## Styling

TODO: build admin (and password) views

## Deployment

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ferntheplant/pitp)

- Targeting one click deploy with Render
  - User needs to:
    - Make render account
    - TODO: make render service?
    - Fill out environment variables
      - see `.env.example`

TODO: figure out how to deal with server failures/restarts on deploy (bad config)

## Development

- Using built in bun SQLite to stand in for Redis instance
  - Write to local file `dev.sqlite` for persistence across server restarts
  - Need to delete file to refresh RSVP list

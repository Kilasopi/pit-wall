-- Local time is derived from timezone alone now (see dashboard/src/pages/DriversPage.jsx);
-- city/country were only ever used to guess the timezone at signup.
ALTER TABLE murder_drivers DROP COLUMN city;
ALTER TABLE murder_drivers DROP COLUMN country;

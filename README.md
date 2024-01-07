# Visualizing CTA Ridership Throughout the Years
CS333: Interactive Data Visualization Final Assignment  
_Carol Liu & Kelly Mei_

## Technology

HTML/CSS | D3.js

## Motivation
CTA ridership has been a prominent topic of discourse within various local forums in the city of Chicago. The heightened scrutiny became especially evident during the 2023 mayoral election, where improvement of the CTA emerged as a pivotal issue. Moreover, the discernable shifts in CTA service quality in recent years following the COVID-19 pandemic, marked by rising concerns about CTA-related crime and drop in service accuracy (e.g. ghost buses, delays, etc.). As native Chicagoans, we wanted to create a visualization that would allow users to easily observe trends in ridership through the years.

## Data Domain
Our dataset (“CTA Ridership ‘L’ Station Entries | Monthly Day Type Averages and Totals”) was pulled from the City of Chicago database. The dataset includes 7 columns that detail total monthly ridership for each station by weekday, Saturdays, or Sundays/holidays. 
We ended up merging several CTA datasets with information about station location (latitude/longitude) and the lines served in order to improve our map visualization. Details on how we cleaned our dataset is included in this [Jupyter Notebook] (data-cleaning.ipynb).

For reference, the dataset link is located [here] (https://data.cityofchicago.org/Transportation/CTA-Ridership-L-Station-Entries-Monthly-Day-Type-A/t2rn-p8d7/about_data).



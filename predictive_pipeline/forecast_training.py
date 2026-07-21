import pandas as pd
from prophet import Prophet
import joblib

df = pd.read_csv('monthly_crimes.csv')
df['ds'] = pd.to_datetime(df['ds'])

model = Prophet(yearly_seasonality = True , weekly_seasonality = False)
model.fit(df)

joblib.dump(model , 'forecsat_model.pkl')
print(" Weights of Forecating models stored as forecast_model.pkl")
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

df = pd.read_csv('risk.csv')
features = ['case_count', 'gang_member', 'account_count',
             'total_transaction_volume', 'call_count', 'violent_ratio']

X = df[features].fillna(0)
scaler = StandardScaler()
X_scale = scaler.fit_transform(X)

model = IsolationForest(contamination=0.1 , random_state=42 
                        , n_estimators=200 , max_samples='auto')
anomaly_labels = model.fit_predict(X_scale)

raw_scores = -model.decision_function(X_scale)
risk_scores = 100 * (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min())

df['risk_score'] = risk_scores
df['anomaly'] = anomaly_labels

joblib.dump(model , 'risk_model.pkl')
joblib.dump(model , 'risk_scale.pkl')

df.to_csv('risk_scores.csv' , index=False)
print("Risk model saved.")
print("\nTop risky individuals : ")
print(df.sort_values('risk_scores' , ascending=False).head(10))

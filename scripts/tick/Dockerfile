FROM python:3.12-slim
WORKDIR /app
RUN pip install requests
COPY gps_tick.py .
CMD ["python", "gps_tick.py"]

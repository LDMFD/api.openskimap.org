# Default image name, can be overridden
IMAGE_NAME ?= api-openskimap-org

# Default container and host ports, can be overridden
CONTAINER_PORT ?= 3000
HOST_PORT ?= 3000

.PHONY: build run import

# Target to build the Docker image
build:
	docker build -t $(IMAGE_NAME) .

# Target to run the Docker image
# It maps HOST_PORT on the host to CONTAINER_PORT in the container
run:
	docker run -p $(HOST_PORT):$(CONTAINER_PORT) $(IMAGE_NAME) 

# Target to run the import.sh script in the prod-api container
import:
	docker-compose -f docker-compose.prod.yml exec prod-api sh /usr/src/app/import.sh 

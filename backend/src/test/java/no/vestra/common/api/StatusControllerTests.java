package no.vestra.common.api;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StatusController.class)
class StatusControllerTests {

	@Autowired
	private MockMvc mvc;

	@Test
	void returnsAppNameAndVersion() throws Exception {
		mvc.perform(get("/api/status"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Vestra"))
			.andExpect(jsonPath("$.version").exists())
			.andExpect(jsonPath("$.serverTime").exists());
	}

}
